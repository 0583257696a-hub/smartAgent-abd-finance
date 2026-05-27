import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { getValue, type ModuleConfig, type OpsRecord, type RecordValue } from "@/lib/modules";

type SupabaseRow = OpsRecord & { id: string; data?: OpsRecord };

const metaFields = new Set(["created_at", "updated_at", "source_key", "data"]);

export async function loadPublicRows(config: ModuleConfig) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await withTimeout(
        supabase.from(config.key).select("*"),
        2500,
      );

      if (!error && data?.length) {
        return (data as SupabaseRow[]).map(normalizeSupabaseRow);
      }
    } catch (error) {
      console.warn(`Falling back to JSON data for ${config.key}`, error);
    }
  }

  return loadJsonRows(config);
}

async function loadJsonRows(config: ModuleConfig) {
  const response = await fetch(`/data/${config.file}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load /data/${config.file}`);
  const rows = (await response.json()) as OpsRecord[];
  return rows.map((row, index) => ({
    ...row,
    id: String(row.id ?? `${config.key}_${index}`),
  }));
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error("Supabase request timed out")), ms);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
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
    const value = getValue(record, field.key);
    if (value === undefined) return;

    if (field.key.includes(".")) {
      const column = field.key.split(".").pop();
      if (column) payload[column] = value;
      return;
    }

    payload[field.key] = value;
  });
  return payload;
}

function cleanRecord(record: OpsRecord) {
  const { id: _id, ...rest } = record;
  return rest;
}
