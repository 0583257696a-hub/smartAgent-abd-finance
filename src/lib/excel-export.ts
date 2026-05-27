import * as XLSX from "xlsx";
import { modules, getValue, type OpsRecord } from "@/lib/modules";

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

  modules.forEach((module) => {
    const header = module.fields.map((field) => field.label);
    const worksheet = XLSX.utils.aoa_to_sheet([header]);
    XLSX.utils.book_append_sheet(workbook, worksheet, module.label.slice(0, 31));
  });

  XLSX.writeFile(workbook, "insurance-ops-import-template.xlsx");
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
