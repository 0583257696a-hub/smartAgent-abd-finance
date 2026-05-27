export const privateModules = [
  "passwords",
  "supervisors",
  "employers",
  "clients",
  "agent_numbers",
  "links",
] as const;

export type PrivateModule = (typeof privateModules)[number];
export type PrivateRecord = OpsRecord;

function assertPrivateModule(module: string): asserts module is PrivateModule {
  if (!(privateModules as readonly string[]).includes(module)) {
    throw new Error(`Unsupported private module: ${module}`);
  }
}

function storageKey(module: string, userId: string) {
  assertPrivateModule(module);
  return `ops_private_${userId}_${module}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRows(module: string, userId: string): PrivateRecord[] {
  if (!canUseLocalStorage()) return [];

  const raw = window.localStorage.getItem(storageKey(module, userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(storageKey(module, userId));
    return [];
  }
}

function writeRows(module: string, userId: string, data: PrivateRecord[]) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(storageKey(module, userId), JSON.stringify(data));
}

function recordId(record: PrivateRecord) {
  if (record.id) return String(record.id);

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getPrivateData(module: string, userId: string) {
  return readRows(module, userId);
}

export function setPrivateData(module: string, userId: string, data: PrivateRecord[]) {
  writeRows(module, userId, data);
}

export function addRecord(module: string, userId: string, record: PrivateRecord) {
  const rows = readRows(module, userId);
  const nextRecord = { ...record, id: recordId(record) };
  const nextRows = [...rows, nextRecord];

  writeRows(module, userId, nextRows);
  return nextRecord;
}

export function updateRecord(
  module: string,
  userId: string,
  id: string,
  record: PrivateRecord,
) {
  const rows = readRows(module, userId);
  const nextRows = rows.map((row) =>
    String(row.id) === String(id) ? { ...row, ...record, id } : row,
  );

  writeRows(module, userId, nextRows);
  return nextRows.find((row) => String(row.id) === String(id)) ?? null;
}

export function deleteRecord(module: string, userId: string, id: string) {
  const rows = readRows(module, userId);
  const nextRows = rows.filter((row) => String(row.id) !== String(id));

  writeRows(module, userId, nextRows);
  return rows.length !== nextRows.length;
}

export function importRecords(module: string, userId: string, records: PrivateRecord[]) {
  const rows = readRows(module, userId);
  const existing = new Set(rows.map((row) => JSON.stringify(row)));
  const imported = records
    .filter((record) => !existing.has(JSON.stringify(record)))
    .map((record) => ({ ...record, id: recordId(record) }));
  const nextRows = [...rows, ...imported];

  writeRows(module, userId, nextRows);
  return imported;
}

export function getUserSetting(key: string, userId: string) {
  if (!canUseLocalStorage()) return "";
  return window.localStorage.getItem(`ops_${key}_${userId}`) ?? "";
}

export function setUserSetting(key: string, userId: string, value: string) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(`ops_${key}_${userId}`, value);
}
import type { OpsRecord } from "@/lib/modules";
