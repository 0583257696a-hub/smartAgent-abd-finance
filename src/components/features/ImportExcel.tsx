import { useState } from "react";
import * as XLSX from "xlsx";
import { getPrivateData, setPrivateData } from "@/lib/local-storage";
import {
  getValue,
  modules,
  setValue,
  type FieldConfig,
  type ModuleConfig,
  type ModuleKey,
  type OpsRecord,
} from "@/lib/modules";
import { normalizeText } from "@/lib/normalize";

const userId = "local-dev";

const moduleAliases: Record<ModuleKey, string[]> = {
  operational_emails: ["מיילים", "מיילים תפעוליים", "emails", "operational emails"],
  email_templates: ["תבניות", "תבניות מייל", "templates", "email templates"],
  passwords: ["סיסמאות", "passwords"],
  supervisors: ["מפקחים", "supervisors"],
  employers: ["מעסיקים", "employers"],
  clients: ["לקוחות", "clients"],
  management_fees: ["דמי ניהול", "fees", "management fees"],
  insurance_discounts: ["הנחות ביטוח", "discounts", "insurance discounts"],
  deposit_accounts: ["חשבונות", "חשבונות בנק", "חשבונות להפקדה", "accounts", "deposit accounts"],
  service_centers: ["מוקדי שירות", "service centers"],
  institution_codes: ["קודי מוסד", "institution codes"],
  links: ["קישורים", "links"],
  agent_numbers: ["מספרי סוכן", "agent numbers"],
  bank_numbers: ["מספרי בנקים", "bank numbers"],
  mortgage_release: ["שחרור משכנתא", "משכנתא", "mortgage"],
};

const fieldAliases: Record<string, string[]> = {
  company: ["חברה", "יצרן"],
  department: ["מחלקה"],
  category: ["קטגוריה"],
  action: ["פעולה"],
  email: ["מייל", "אימייל", "דואל", "דוא\"ל", "מייל אסמכתאות"],
  notes: ["הערות"],
  title: ["שם תבנית", "תבנית", "שם"],
  subject: ["נושא", "Subject"],
  body: ["גוף התבנית", "גוף", "תוכן", "Body"],
  system: ["מערכת"],
  url: ["URL", "קישור"],
  username: ["שם משתמש", "משתמש"],
  password: ["סיסמה"],
  name: ["שם"],
  role: ["תפקיד"],
  phone: ["טלפון"],
  employer: ["מעסיק"],
  contact_name: ["איש קשר"],
  first_name: ["שם", "שם פרטי"],
  last_name: ["משפחה", "שם משפחה"],
  national_id: ["ת.ז", "תז", "תעודת זהות"],
  address: ["כתובת", "כתובת מלאה"],
  birth_date: ["ת. לידה", "תאריך לידה"],
  issue_date: ["ת. הנפקה", "תאריך הנפקה"],
  product: ["מוצר"],
  range: ["טווח", "טווח/שכר", "טווח צבירה", "שכר"],
  balance_fee: ["מצבירה %", "מצבירה", "דמי ניהול מצבירה"],
  deposit_fee: ["מהפקדה %", "מהפקדה", "דמי ניהול מהפקדה"],
  validity: ["תוקף"],
  priority: ["עדיפות"],
  track: ["מסלול"],
  agreement_number: ["הסכם", "מספר הסכם", "מס' הסכם"],
  "discounts.year1": ["שנה א׳", "שנה א'", "שנה א", "year1"],
  "discounts.year2": ["שנה ב׳", "שנה ב'", "שנה ב", "year2"],
  "discounts.year3": ["שנה ג׳", "שנה ג'", "שנה ג", "year3"],
  "discounts.year4": ["שנה ד׳", "שנה ד'", "שנה ד", "year4"],
  "discounts.year5to6": ["שנים ה׳-ו׳", "שנים ה'-ו'", "ה׳-ו׳", "year5to6"],
  conditions: ["תנאים", "conditions"],
  bank: ["בנק"],
  branch: ["סניף"],
  account: ["חשבון"],
  iban: ["IBAN"],
  hours: ["שעות", "שעות פעילות"],
  customer_phone: ["טלפון לקוח", "טלפון לקוחות"],
  type: ["סוג"],
  code: ["קוד"],
  agent_number: ["מספר סוכן"],
  bank_name: ["בנק", "שם בנק"],
  bank_number: ["מספר בנק"],
  entity: ["גוף", "גורם"],
  contact: ["איש קשר"],
};

const dedupFields: Partial<Record<ModuleKey, string[]>> = {
  operational_emails: ["company", "category", "action", "email"],
  email_templates: ["title", "category"],
  management_fees: ["company", "product", "range"],
  insurance_discounts: ["company", "product", "track", "agreement_number"],
  institution_codes: ["company", "type", "code"],
  bank_numbers: ["bank_number"],
};

export default function ImportExcel() {
  const [importing, setImporting] = useState(false);

  async function handleFile(file: File) {
    setImporting(true);
    const summary = { added: 0, updated: 0, skipped: 0 };
    const sheetSummaries: string[] = [];

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });

      for (const sheetName of workbook.SheetNames) {
        try {
          const config = findModule(sheetName);
          if (!config) {
            summary.skipped += 1;
            sheetSummaries.push(`${sheetName}: לא זוהה`);
            continue;
          }

          const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(
            workbook.Sheets[sheetName],
            { defval: "", raw: false },
          );
          const rows = rawRows.map((row) => mapExcelRow(row, config)).filter((row) => hasValues(row, config.fields));

          if (config.source === "private") {
            const result = importPrivateRows(config, rows);
            summary.added += result.added;
            summary.updated += result.updated;
            sheetSummaries.push(`${sheetName}: ${result.added} נוספו, ${result.updated} עודכנו`);
            continue;
          }

          const result = await importPublicRows(config, rows);
          summary.added += result.added;
          summary.updated += result.updated;
          summary.skipped += result.skipped;
          sheetSummaries.push(`${sheetName}: ${result.added} נוספו, ${result.updated} עודכנו, ${result.skipped} דולגו`);
        } catch (error) {
          console.error(`Import failed for sheet ${sheetName}`, error);
          summary.skipped += 1;
          sheetSummaries.push(`${sheetName}: נכשל`);
        }
      }

      alert([
        `${summary.added} נוספו, ${summary.updated} עודכנו, ${summary.skipped} דולגו`,
        "",
        ...sheetSummaries,
      ].join("\n"));
      window.dispatchEvent(new Event("ops:data-imported"));
    } catch (error) {
      console.error(error);
      alert(`ייבוא האקסל נכשל: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`);
    } finally {
      setImporting(false);
    }
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
      cursor: importing ? "wait" : "pointer",
      fontWeight: 800,
      opacity: importing ? 0.7 : 1,
    }}>
      {importing ? "מייבא..." : "ייבוא Excel"}
      <input
        type="file"
        accept=".xlsx,.xls"
        hidden
        disabled={importing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </label>
  );
}

function findModule(sheetName: string) {
  const normalized = normalizeText(sheetName);
  return modules.find((module) => {
    const aliases = [module.key, module.label, module.title, module.file.replace(".json", ""), ...(moduleAliases[module.key] ?? [])];
    return aliases.some((alias) => normalizeText(alias) === normalized);
  });
}

function mapExcelRow(row: Record<string, string>, config: ModuleConfig) {
  const output: OpsRecord = {};

  Object.entries(row).forEach(([header, value]) => {
    const field = findField(header, config.fields);
    if (!field) return;
    setValue(output, field.key, String(value ?? "").trim());
  });

  return output;
}

function findField(header: string, fields: FieldConfig[]) {
  const normalized = normalizeText(header);
  return fields.find((field) => {
    const aliases = [field.key, field.key.split(".").pop() ?? "", field.label, ...(fieldAliases[field.key] ?? [])];
    return aliases.some((alias) => normalizeText(alias) === normalized);
  });
}

function hasValues(row: OpsRecord, fields: FieldConfig[]) {
  return fields.some((field) => String(getValue(row, field.key) ?? "").trim());
}

async function importPublicRows(config: ModuleConfig, rows: OpsRecord[]) {
  const response = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleKey: config.key, records: rows }),
  });

  if (!response.ok) {
    throw new Error(`Import failed for ${config.key}`);
  }

  return (await response.json()) as { added: number; updated: number; skipped: number };
}

function importPrivateRows(config: ModuleConfig, rows: OpsRecord[]) {
  const existing = getPrivateData(config.key, userId);
  let added = 0;
  let updated = 0;

  rows.forEach((row) => {
    const match = findDuplicate(existing, row, config);
    if (match) {
      Object.assign(match, row);
      updated += 1;
      return;
    }

    existing.push({ ...row, id: recordId() });
    added += 1;
  });

  setPrivateData(config.key, userId, existing);
  return { added, updated };
}

function findDuplicate(rows: OpsRecord[], row: OpsRecord, config: ModuleConfig) {
  const fields = dedupFields[config.key] ?? config.fields.map((field) => field.key);
  return rows.find((candidate) => fields.every((field) => normalizedValue(candidate, field) === normalizedValue(row, field)));
}

function normalizedValue(row: OpsRecord, field: string) {
  return normalizeText(String(getValue(row, field) ?? "").trim());
}

function recordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
