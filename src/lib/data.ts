import { getValue, type ModuleConfig, type OpsRecord } from "@/lib/modules";

const userId = "local-dev";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function publicStorageKey(module: string) {
  return `ops_cloudflare_${userId}_${module}`;
}

function readStoredRows(config: ModuleConfig) {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(publicStorageKey(config.key));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OpsRecord[]) : null;
  } catch {
    window.localStorage.removeItem(publicStorageKey(config.key));
    return null;
  }
}

function writeStoredRows(config: ModuleConfig, rows: OpsRecord[]) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(publicStorageKey(config.key), JSON.stringify(rows));
}

export async function loadPublicRows(config: ModuleConfig) {
  const cloudRows = await loadCloudflareRows(config);
  if (cloudRows) return cloudRows;

  const stored = readStoredRows(config);
  if (stored) return stored;

  const rows = await loadJsonRows(config);
  writeStoredRows(config, rows);
  return rows;
}

async function loadJsonRows(config: ModuleConfig) {
  const response = await fetch(`/data/${config.file}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load /data/${config.file}`);
  const rows = (await response.json()) as OpsRecord[];
  return rows.map((row, index) => ({
    ...normalizeRecord(config, row),
    id: String(row.id ?? `${config.key}_${index}`),
  }));
}

export async function createPublicRow(config: ModuleConfig, record: OpsRecord) {
  const cloudRow = await createCloudflareRow(config, record);
  if (cloudRow) return cloudRow;

  const rows = await loadPublicRows(config);
  const nextRecord = { ...normalizeRecord(config, record), id: recordId() };
  writeStoredRows(config, [...rows, nextRecord]);
  return nextRecord;
}

export async function updatePublicRow(config: ModuleConfig, id: string, record: OpsRecord) {
  const cloudRow = await updateCloudflareRow(config, id, record);
  if (cloudRow) return cloudRow;

  const rows = await loadPublicRows(config);
  const nextRecord = { ...normalizeRecord(config, record), id };
  const nextRows = rows.map((row) => (String(row.id) === String(id) ? nextRecord : row));
  writeStoredRows(config, nextRows);
  return nextRecord;
}

export async function deletePublicRow(config: ModuleConfig, id: string) {
  if (await deleteCloudflareRow(config, id)) return;

  const rows = await loadPublicRows(config);
  writeStoredRows(
    config,
    rows.filter((row) => String(row.id) !== String(id)),
  );
}

export async function importPublicRows(config: ModuleConfig, records: OpsRecord[]) {
  const cloudSummary = await importCloudflareRows(config, records);
  if (cloudSummary) return cloudSummary;

  const rows = await loadPublicRows(config);
  const keys = dedupFields[config.key] ?? config.fields.map((field) => field.key);
  const existing = new Map(rows.map((row) => [dedupeKey(row, keys), row]));
  const incoming = new Set<string>();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  records.forEach((record) => {
    const normalized = normalizeRecord(config, record);
    if (!hasValues(config, normalized)) {
      skipped += 1;
      return;
    }

    const key = dedupeKey(normalized, keys);
    if (incoming.has(key)) {
      skipped += 1;
      return;
    }
    incoming.add(key);

    const match = existing.get(key);
    if (match) {
      Object.assign(match, normalized);
      updated += 1;
      return;
    }

    rows.push({ ...normalized, id: recordId() });
    added += 1;
  });

  writeStoredRows(config, rows);
  return { added, updated, skipped };
}

async function loadCloudflareRows(config: ModuleConfig) {
  try {
    const response = await fetch(`/api/data/${config.key}`, { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as { rows?: OpsRecord[] };
    return Array.isArray(body.rows) ? body.rows : null;
  } catch {
    return null;
  }
}

async function createCloudflareRow(config: ModuleConfig, record: OpsRecord) {
  try {
    const response = await fetch(`/api/data/${config.key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { row?: OpsRecord };
    return body.row ?? null;
  } catch {
    return null;
  }
}

async function updateCloudflareRow(config: ModuleConfig, id: string, record: OpsRecord) {
  try {
    const response = await fetch(`/api/data/${config.key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, record }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { row?: OpsRecord };
    return body.row ?? null;
  } catch {
    return null;
  }
}

async function deleteCloudflareRow(config: ModuleConfig, id: string) {
  try {
    const response = await fetch(`/api/data/${config.key}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function importCloudflareRows(config: ModuleConfig, records: OpsRecord[]) {
  try {
    const response = await fetch(`/api/data/${config.key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    if (!response.ok) return null;
    return (await response.json()) as { added: number; updated: number; skipped: number };
  } catch {
    return null;
  }
}

function normalizeRecord(config: ModuleConfig, record: OpsRecord) {
  const output: OpsRecord = {};

  config.fields.forEach((field) => {
    const value = getValue(record, field.key);
    if (value !== undefined) output[field.key] = value;
  });

  if (record.id) output.id = record.id;
  return { ...record, ...output };
}

function hasValues(config: ModuleConfig, row: OpsRecord) {
  return config.fields.some((field) => String(getValue(row, field.key) ?? "").trim());
}

function dedupeKey(row: OpsRecord, keys: string[]) {
  return keys.map((key) => normalize(String(getValue(row, key) ?? ""))).join("|");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function recordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const dedupFields: Partial<Record<string, string[]>> = {
  operational_emails: ["company", "category", "action", "email"],
  email_templates: ["title", "category"],
  management_fees: ["company", "product", "range"],
  insurance_discounts: ["company", "product", "track", "agreement_number"],
  institution_codes: ["company", "type", "code"],
  bank_numbers: ["bank_number"],
};
