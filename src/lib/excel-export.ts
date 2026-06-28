import * as XLSX from "xlsx";
import { loadPublicRows } from "@/lib/data";
import { getPrivateData } from "@/lib/local-storage";
import { modules, getValue, type ModuleConfig, type OpsRecord, type RecordValue } from "@/lib/modules";

export function exportToExcel(moduleName: string, data: OpsRecord[]) {
  const config = modules.find((item) => item.key === moduleName);
  const fields = config?.fields ?? [];
  const header = fields.map((field) => field.label);
  const rows = data.map((row) => fields.map((field) => String(getValue(row, field.key) ?? "")));
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

  XLSX.utils.book_append_sheet(workbook, worksheet, config?.label.slice(0, 31) || "Data");
  XLSX.writeFile(workbook, `${moduleName}.xlsx`);
}

export function downloadTemplate() {
  const workbook = XLSX.utils.book_new();

  modules.forEach((moduleConfig) => {
    const header = moduleConfig.fields.map((field) => field.label);
    const worksheet = XLSX.utils.aoa_to_sheet([header]);
    XLSX.utils.book_append_sheet(workbook, worksheet, moduleConfig.label.slice(0, 31));
  });

  XLSX.writeFile(workbook, "insurance-ops-import-template.xlsx");
}

export async function exportBackupExcel(userId: string) {
  const workbook = XLSX.utils.book_new();

  for (const moduleConfig of modules) {
    const rows =
      moduleConfig.source === "private"
        ? getPrivateData(moduleConfig.key, userId)
        : await loadPublicRows(moduleConfig);

    appendModuleSheet(workbook, moduleConfig, rows);
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `insurance-ops-backup-${date}.xlsx`);
}

export function exportBackupJson(data: Record<string, OpsRecord[]>) {
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), data }, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "insurance-ops-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

function appendModuleSheet(workbook: XLSX.WorkBook, moduleConfig: ModuleConfig, rows: OpsRecord[]) {
  const header = moduleConfig.fields.map((field) => field.label);
  const body = rows.map((row) =>
    moduleConfig.fields.map((field) => stringifyCellValue(getExcelValue(row, field.key))),
  );
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...body]);

  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(moduleConfig.label));
}

function getExcelValue(row: OpsRecord, key: string) {
  const directValue = getValue(row, key);
  if (directValue !== "" && directValue !== null && directValue !== undefined) return directValue;

  if (!key.includes(".")) return row[key];

  const lastSegment = key.split(".").pop();
  return lastSegment ? row[lastSegment] : "";
}

function stringifyCellValue(value: RecordValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function safeSheetName(name: string) {
  return name.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Data";
}
