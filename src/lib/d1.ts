import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getValue, moduleByKey, type ModuleConfig, type ModuleKey, type OpsRecord } from "@/lib/modules";

type OpsCloudflareEnv = CloudflareEnv & {
  OPS_DB?: D1Database;
};

type D1Row = {
  record_id: string;
  data: string;
};

const seededModuleIds = new Set<string>();

export async function getOpsDb() {
  try {
    const context = await getCloudflareContext<{ waitUntil?: unknown }, ExecutionContext>({ async: true });
    return (context.env as OpsCloudflareEnv).OPS_DB ?? null;
  } catch {
    return null;
  }
}

export async function listD1Rows(config: ModuleConfig, request: Request) {
  const db = await getOpsDb();
  if (!db) return null;

  await ensureSchema(db);
  await seedModuleIfEmpty(db, config, request);

  const result = await db
    .prepare("select record_id, data from ops_records where module = ? order by updated_at desc")
    .bind(config.key)
    .all<D1Row>();

  return (result.results ?? []).map(rowFromD1);
}

export async function createD1Row(config: ModuleConfig, record: OpsRecord, request: Request) {
  const db = await getOpsDb();
  if (!db) return null;

  await ensureSchema(db);
  await seedModuleIfEmpty(db, config, request);

  const nextRecord = { ...record, id: recordId() };
  await putD1Row(db, config, nextRecord);
  return nextRecord;
}

export async function updateD1Row(config: ModuleConfig, id: string, record: OpsRecord, request: Request) {
  const db = await getOpsDb();
  if (!db) return null;

  await ensureSchema(db);
  await seedModuleIfEmpty(db, config, request);

  const nextRecord = { ...record, id };
  await putD1Row(db, config, nextRecord);
  return nextRecord;
}

export async function deleteD1Row(config: ModuleConfig, id: string) {
  const db = await getOpsDb();
  if (!db) return null;

  await ensureSchema(db);
  await db
    .prepare("delete from ops_records where module = ? and record_id = ?")
    .bind(config.key, id)
    .run();

  return true;
}

export async function importD1Rows(config: ModuleConfig, records: OpsRecord[], request: Request) {
  const db = await getOpsDb();
  if (!db) return null;

  await ensureSchema(db);
  await seedModuleIfEmpty(db, config, request);

  const existingRows = await db
    .prepare("select record_id, data from ops_records where module = ?")
    .bind(config.key)
    .all<D1Row>();

  const existing = new Map(
    (existingRows.results ?? []).map((row) => {
      const record = rowFromD1(row);
      return [dedupeKey(config, record), record];
    }),
  );
  const incoming = new Set<string>();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    if (!hasValues(config, record)) {
      skipped += 1;
      continue;
    }

    const key = dedupeKey(config, record);
    if (incoming.has(key)) {
      skipped += 1;
      continue;
    }

    incoming.add(key);
    const match = existing.get(key);
    if (match?.id) {
      await putD1Row(db, config, { ...match, ...record, id: match.id });
      updated += 1;
      continue;
    }

    await putD1Row(db, config, { ...record, id: recordId() });
    added += 1;
  }

  return { added, updated, skipped };
}

async function ensureSchema(db: D1Database) {
  await db
    .prepare(
      `create table if not exists ops_records (
        module text not null,
        record_id text not null,
        dedupe_key text not null,
        data text not null,
        created_at text not null default current_timestamp,
        updated_at text not null default current_timestamp,
        primary key (module, record_id)
      )`,
    )
    .run();

  await db
    .prepare("create unique index if not exists idx_ops_records_dedupe on ops_records(module, dedupe_key)")
    .run();
}

async function seedModuleIfEmpty(db: D1Database, config: ModuleConfig, request: Request) {
  if (seededModuleIds.has(config.key)) return;

  const count = await db
    .prepare("select count(*) as count from ops_records where module = ?")
    .bind(config.key)
    .first<{ count: number }>();

  if (Number(count?.count ?? 0) > 0) {
    seededModuleIds.add(config.key);
    return;
  }

  const url = new URL(`/data/${config.file}`, request.url);
  const response = await fetch(url);
  if (!response.ok) return;

  const rows = (await response.json()) as OpsRecord[];
  for (const [index, row] of rows.entries()) {
    await putD1Row(db, config, {
      ...row,
      id: String(row.id ?? `${config.key}_${index}`),
    });
  }

  seededModuleIds.add(config.key);
}

async function putD1Row(db: D1Database, config: ModuleConfig, record: OpsRecord) {
  const id = String(record.id ?? recordId());
  const data = JSON.stringify({ ...record, id });
  const key = dedupeKey(config, { ...record, id });

  await db
    .prepare(
      `insert into ops_records (module, record_id, dedupe_key, data, created_at, updated_at)
       values (?, ?, ?, ?, current_timestamp, current_timestamp)
       on conflict(module, record_id) do update set
         dedupe_key = excluded.dedupe_key,
         data = excluded.data,
         updated_at = current_timestamp`,
    )
    .bind(config.key, id, key, data)
    .run();
}

function rowFromD1(row: D1Row) {
  try {
    const data = JSON.parse(row.data) as OpsRecord;
    return { ...data, id: String(data.id ?? row.record_id) };
  } catch {
    return { id: row.record_id };
  }
}

function hasValues(config: ModuleConfig, row: OpsRecord) {
  return config.fields.some((field) => String(getValue(row, field.key) ?? "").trim());
}

function dedupeKey(config: ModuleConfig, row: OpsRecord) {
  const keys = dedupFields[config.key] ?? config.fields.map((field) => field.key);
  return keys.map((key) => normalize(String(getValue(row, key) ?? ""))).join("|");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function recordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const dedupFields: Partial<Record<ModuleKey, string[]>> = {
  operational_emails: ["company", "category", "action", "email"],
  email_templates: ["title", "category"],
  management_fees: ["company", "product", "range"],
  insurance_discounts: ["company", "product", "track", "agreement_number"],
  institution_codes: ["company", "type", "code"],
  bank_numbers: ["bank_number"],
};

export function resolvePublicConfig(moduleKey: string) {
  const config = moduleByKey(moduleKey as ModuleKey);
  if (!config || config.source !== "public") return null;
  return config;
}
