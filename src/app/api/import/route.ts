import { createServiceClient } from "@/lib/supabase";
import type { ModuleKey, OpsRecord, RecordValue } from "@/lib/modules";

const publicModules = new Set<ModuleKey>([
  "operational_emails",
  "email_templates",
  "management_fees",
  "insurance_discounts",
  "deposit_accounts",
  "service_centers",
  "institution_codes",
  "bank_numbers",
  "mortgage_release",
]);

const dedupFields: Partial<Record<ModuleKey, string[]>> = {
  operational_emails: ["company", "category", "action", "email"],
  email_templates: ["title", "category"],
  management_fees: ["company", "product", "range"],
  insurance_discounts: ["company", "product", "track", "agreement_number"],
  institution_codes: ["company", "type", "code"],
  bank_numbers: ["bank_number"],
};

const moduleColumns: Partial<Record<ModuleKey, string[]>> = {
  operational_emails: ["company", "department", "category", "action", "email", "notes"],
  email_templates: ["title", "category", "subject", "body"],
  management_fees: ["company", "product", "range", "balance_fee", "deposit_fee", "validity", "priority"],
  insurance_discounts: [
    "company",
    "product",
    "track",
    "agreement_number",
    "year1",
    "year2",
    "year3",
    "year4",
    "year5to6",
    "validity",
    "notes",
    "conditions",
  ],
  deposit_accounts: ["company", "product", "bank", "branch", "account", "iban", "email", "notes"],
  service_centers: ["company", "department", "phone", "email", "hours", "customer_phone"],
  institution_codes: ["company", "type", "code"],
  bank_numbers: ["bank_name", "bank_number"],
  mortgage_release: ["entity", "contact", "type"],
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    moduleKey?: ModuleKey;
    records?: OpsRecord[];
  };
  const moduleKey = body.moduleKey;

  if (!moduleKey || !publicModules.has(moduleKey)) {
    return Response.json({ error: "Unsupported module" }, { status: 400 });
  }

  const records = Array.isArray(body.records) ? body.records : [];
  const supabase = createServiceClient();
  const columns = moduleColumns[moduleKey] ?? [];
  const keys = dedupFields[moduleKey] ?? columns;
  const summary = { added: 0, updated: 0, skipped: 0 };
  const existing = new Map<string, string>();
  const incoming = new Set<string>();

  const existingResponse = await supabase.from(moduleKey).select(["id", ...columns].join(","));
  if (existingResponse.error) {
    return Response.json({ error: existingResponse.error.message }, { status: 500 });
  }

  (existingResponse.data as unknown as Record<string, string>[] | null)?.forEach((row) => {
    existing.set(dedupeKey(row, keys), String(row.id ?? ""));
  });

  const rowsToInsert: Record<string, string>[] = [];
  const rowsToUpdate: Array<{ id: string; payload: Record<string, string> }> = [];

  records.forEach((record) => {
    const payload = toColumnPayload(record, columns);
    if (!Object.values(payload).some((value) => String(value ?? "").trim())) {
      summary.skipped += 1;
      return;
    }

    const key = dedupeKey(payload, keys);
    if (incoming.has(key)) {
      summary.skipped += 1;
      return;
    }

    incoming.add(key);
    const existingId = existing.get(key);
    if (existingId) {
      rowsToUpdate.push({ id: existingId, payload });
      return;
    }

    rowsToInsert.push(payload);
  });

  for (const row of rowsToUpdate) {
    const { error } = await supabase.from(moduleKey).update(row.payload).eq("id", row.id);
    if (error) summary.skipped += 1;
    else summary.updated += 1;
  }

  for (let index = 0; index < rowsToInsert.length; index += 250) {
    const chunk = rowsToInsert.slice(index, index + 250);
    const { error } = await supabase.from(moduleKey).insert(chunk);
    if (error) summary.skipped += 1;
    else summary.added += chunk.length;
  }

  return Response.json(summary);
}

function toColumnPayload(record: OpsRecord, columns: string[]) {
  const payload: Record<string, string> = {};

  columns.forEach((column) => {
    const value = readValue(record, column);
    if (value !== undefined && value !== null) payload[column] = String(value);
  });

  return payload;
}

function readValue(record: OpsRecord, key: string): RecordValue {
  if (record[key] !== undefined) return record[key];

  const discounts = record.discounts;
  if (discounts && typeof discounts === "object" && !Array.isArray(discounts)) {
    return discounts[key];
  }

  return "";
}

function dedupeKey(row: Record<string, string>, keys: string[]) {
  return keys.map((key) => normalize(String(row[key] ?? ""))).join("|");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
