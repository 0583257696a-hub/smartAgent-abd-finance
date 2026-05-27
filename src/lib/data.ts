import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ModuleConfig, OpsRecord, RecordValue } from "@/lib/modules";

type SupabaseRow = OpsRecord & { id: string; data?: OpsRecord };

const metaFields = new Set(["created_at", "updated_at", "source_key", "data"]);

export async function loadPublicRows(config: ModuleConfig) {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(config.key)
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data?.length) {
      return (data as SupabaseRow[]).map(normalizeSupabaseRow);
    }
  }

  return loadJsonRows(config);
}

async function loadJsonRows(config: ModuleConfig) {
  const response = await fetch(`/data/${config.file}`, { cache: "no-store" });
  const rows = (await response.json()) as OpsRecord[];
  return rows.map((row, index) => ({
    ...row,
    id: String(row.id ?? `${config.key}_${index}`),
  }));
}

export async function createPublicRow(config: ModuleConfig, record: OpsRecord) {
  if (!isSupabaseConfigured()) return record;

  const supabase = createClient();
  const payload = toColumnPayload(config, record);
  const insert = await supabase.from(config.key).insert(payload).select("*").single();
  if (!insert.error && insert.data) return normalizeSupabaseRow(insert.data as SupabaseRow);

  const jsonbInsert = await supabase
    .from(config.key)
    .insert({
      source_key: `${config.key}:${crypto.randomUUID()}`,
      data: cleanRecord(record),
    })
    .select("*")
    .single();

  if (jsonbInsert.error) throw insert.error ?? jsonbInsert.error;
  return normalizeSupabaseRow(jsonbInsert.data as SupabaseRow);
}

export async function updatePublicRow(config: ModuleConfig, id: string, record: OpsRecord) {
  if (!isSupabaseConfigured()) return { ...record, id };

  const supabase = createClient();
  const update = await supabase
    .from(config.key)
    .update(toColumnPayload(config, record))
    .eq("id", id)
    .select("*")
    .single();
  if (!update.error && update.data) return normalizeSupabaseRow(update.data as SupabaseRow);

  const jsonbUpdate = await supabase
    .from(config.key)
    .update({ data: cleanRecord(record) })
    .eq("id", id)
    .select("*")
    .single();

  if (jsonbUpdate.error) throw update.error ?? jsonbUpdate.error;
  return normalizeSupabaseRow(jsonbUpdate.data as SupabaseRow);
}

export async function deletePublicRow(config: ModuleConfig, id: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = createClient();
  const { error } = await supabase.from(config.key).delete().eq("id", id);
  if (error) throw error;
}

function normalizeSupabaseRow(row: SupabaseRow): OpsRecord {
  if (row.data && typeof row.data === "object" && !Array.isArray(row.data)) {
    return { ...row.data, id: row.id };
  }

  const output: OpsRecord = { id: row.id };
  Object.entries(row).forEach(([key, value]) => {
    if (key !== "id" && !metaFields.has(key)) output[key] = value as RecordValue;
  });
  return output;
}

function toColumnPayload(config: ModuleConfig, record: OpsRecord) {
  const payload: OpsRecord = {};
  config.fields.forEach((field) => {
    if (record[field.key] !== undefined) payload[field.key] = record[field.key];
  });
  return payload;
}

function cleanRecord(record: OpsRecord) {
  const { id: _id, ...rest } = record;
  return rest;
}
