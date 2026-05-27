import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ModuleConfig, OpsRecord } from "@/lib/modules";

type SupabaseRow = { id: string; data: OpsRecord };

export async function loadPublicRows(config: ModuleConfig) {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(config.key)
      .select("id,data")
      .order("created_at", { ascending: true });

    if (!error && data) {
      return (data as SupabaseRow[]).map((row) => ({ ...row.data, id: row.id }));
    }
  }

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
  const { data, error } = await supabase
    .from(config.key)
    .insert({
      source_key: `${config.key}:${crypto.randomUUID()}`,
      data: record,
    })
    .select("id,data")
    .single();

  if (error) throw error;
  const row = data as SupabaseRow;
  return { ...row.data, id: row.id };
}

export async function updatePublicRow(config: ModuleConfig, id: string, record: OpsRecord) {
  if (!isSupabaseConfigured()) return { ...record, id };

  const supabase = createClient();
  const { data, error } = await supabase
    .from(config.key)
    .update({ data: { ...record, id: undefined } })
    .eq("id", id)
    .select("id,data")
    .single();

  if (error) throw error;
  const row = data as SupabaseRow;
  return { ...row.data, id: row.id };
}

export async function deletePublicRow(config: ModuleConfig, id: string) {
  if (!isSupabaseConfigured()) return;

  const supabase = createClient();
  const { error } = await supabase.from(config.key).delete().eq("id", id);
  if (error) throw error;
}
