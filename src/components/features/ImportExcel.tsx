import * as XLSX from "xlsx";
import { modules, setValue, type OpsRecord } from "@/lib/modules";

export default function ImportExcel({
  onImport,
}: {
  onImport?: (moduleKey: string, rows: OpsRecord[]) => void;
}) {
  async function handleFile(file: File) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const summary = { added: 0, updated: 0, skipped: 0 };

    workbook.SheetNames.forEach((sheetName) => {
      const config = modules.find((item) => item.label === sheetName || item.key === sheetName);
      if (!config) {
        summary.skipped += 1;
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[sheetName], { defval: "", raw: false });
      const mapped = rows.map((row) => {
        const output: OpsRecord = {};
        Object.entries(row).forEach(([header, value]) => {
        const field = config.fields.find((item) => item.label === header || item.key === header);
          if (field) setValue(output, field.key, String(value ?? ""));
        });
        return output;
      });

      summary.added += mapped.length;
      onImport?.(config.key, mapped);
    });

    alert(`${summary.added} נוספו, ${summary.updated} עודכנו, ${summary.skipped} דולגו`);
  }

  return (
    <label style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px dashed #93B4DC",
      borderRadius: 12,
      padding: "12px 16px",
      color: "var(--primary)",
      cursor: "pointer",
      fontWeight: 800,
    }}>
      ייבוא Excel
      <input
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </label>
  );
}
