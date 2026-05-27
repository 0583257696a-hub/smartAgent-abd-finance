import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "../scripts/load-env";

loadEnvFile();

const publicModules = [
  "operational_emails",
  "email_templates",
  "management_fees",
  "insurance_discounts",
  "service_centers",
  "institution_codes",
  "bank_numbers",
  "mortgage_release",
  "deposit_accounts",
] as const;

type PublicModule = (typeof publicModules)[number];
type JsonValue = string | number | boolean | null | undefined | Record<string, unknown>;
type JsonRecord = Record<string, JsonValue>;
type DbRecord = Record<string, string | number | null>;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const dedupeKeys: Partial<Record<PublicModule, string[]>> = {
  operational_emails: ["company", "category", "action", "email"],
  email_templates: ["title", "category"],
  management_fees: ["company", "product", "range"],
  insurance_discounts: ["company", "product", "track", "agreement_number"],
  institution_codes: ["company", "type", "code"],
  bank_numbers: ["bank_number"],
};

async function readModuleRows(moduleName: PublicModule) {
  const filePath = path.join(process.cwd(), "public", "data", `${moduleName}.json`);
  const file = await readFile(filePath, "utf8");
  const rows = JSON.parse(file);

  if (!Array.isArray(rows)) {
    throw new Error(`${moduleName}.json must contain an array`);
  }

  return rows as JsonRecord[];
}

function text(value: JsonValue) {
  if (value === undefined || value === null) return null;
  const clean = String(value).trim();
  return clean || null;
}

function nested(row: JsonRecord, pathKey: string) {
  return pathKey.split(".").reduce<JsonValue>((value, key) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return (value as Record<string, JsonValue>)[key];
  }, row);
}

function normalized(value: JsonValue) {
  return String(value ?? "").trim().toLowerCase();
}

function numeric(value: JsonValue) {
  if (value === undefined || value === null) return null;
  const clean = String(value).replace("%", "").replace(/[^\d.-]/g, "").trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function keyFor(row: DbRecord, keys: string[]) {
  return keys.map((key) => normalized(row[key])).join("|");
}

function mapRow(moduleName: PublicModule, row: JsonRecord): DbRecord {
  switch (moduleName) {
    case "operational_emails":
      return {
        company: text(row.company),
        department: text(row.department),
        category: text(row.category),
        action: text(row.action),
        email: text(row.email),
        notes: text(row.notes),
      };
    case "email_templates":
      return {
        title: text(row.title),
        category: text(row.category),
        subject: text(row.subject),
        body: text(row.body),
      };
    case "management_fees":
      return {
        company: text(row.company),
        product: text(row.product),
        range: text(row.range),
        balance_fee: numeric(row.balance_fee),
        deposit_fee: numeric(row.deposit_fee),
        validity: text(row.validity),
        priority: text(row.priority),
      };
    case "insurance_discounts":
      return {
        company: text(row.company),
        product: text(row.product),
        track: text(row.track),
        agreement_number: text(row.agreement_number),
        year1: numeric(nested(row, "discounts.year1")),
        year2: numeric(nested(row, "discounts.year2")),
        year3: numeric(nested(row, "discounts.year3")),
        year4: numeric(nested(row, "discounts.year4")),
        year5to6: numeric(nested(row, "discounts.year5to6")),
        validity: text(row.validity),
        notes: text(row.notes),
        conditions: text(row.conditions),
      };
    case "service_centers":
      return {
        company: text(row.company),
        department: text(row.department),
        phone: text(row.phone),
        email: text(row.email),
        hours: text(row.hours),
        customer_phone: text(row.customer_phone),
      };
    case "institution_codes":
      return {
        company: text(row.company),
        type: text(row.type),
        code: text(row.code),
      };
    case "bank_numbers":
      return {
        bank_name: text(row.bank_name),
        bank_number: text(row.bank_number),
      };
    case "mortgage_release":
      return {
        entity: text(row.entity),
        contact: text(row.contact),
        type: text(row.type),
      };
    case "deposit_accounts":
      return {
        company: text(row.company),
        product: text(row.product),
        bank: text(row.bank),
        branch: text(row.branch),
        account: text(row.account),
        iban: text(row.iban),
        email: text(row.email),
        notes: text(row.notes),
      };
  }
}

function uniqueRows(moduleName: PublicModule, rows: DbRecord[]) {
  const keys = dedupeKeys[moduleName];
  if (!keys) return rows;

  const map = new Map<string, DbRecord>();
  rows.forEach((row) => {
    const key = keyFor(row, keys);
    if (key.replace(/\|/g, "")) map.set(key, row);
  });

  return [...map.values()];
}

async function fetchExistingKeys(moduleName: PublicModule, keys: string[]) {
  const { data, error } = await supabase
    .from(moduleName)
    .select(keys.join(","));

  if (error) throw error;

  return new Set((data ?? []).map((row) => keyFor(row as unknown as DbRecord, keys)));
}

async function insertMissing(moduleName: PublicModule, rows: DbRecord[]) {
  const keys = dedupeKeys[moduleName];
  let rowsToInsert = uniqueRows(moduleName, rows);

  if (keys) {
    const existingKeys = await fetchExistingKeys(moduleName, keys);
    rowsToInsert = rowsToInsert.filter((row) => !existingKeys.has(keyFor(row, keys)));
  }

  if (!rowsToInsert.length) return 0;

  const { error } = await supabase.from(moduleName).insert(rowsToInsert);
  if (error) throw error;

  return rowsToInsert.length;
}

async function seedModule(moduleName: PublicModule) {
  const sourceRows = await readModuleRows(moduleName);
  const mappedRows = sourceRows.map((row) => mapRow(moduleName, row));
  const inserted = await insertMissing(moduleName, mappedRows);

  console.log(`${moduleName}: added ${inserted}`);
}

async function main() {
  for (const moduleName of publicModules) {
    await seedModule(moduleName);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
