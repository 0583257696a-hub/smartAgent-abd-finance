import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Code,
  CreditCard,
  DollarSign,
  FileText,
  Hash,
  HeadphonesIcon,
  Home,
  Landmark,
  Link2,
  Lock,
  Mail,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";

export type RecordValue = string | number | boolean | null | undefined | Record<string, string | undefined>;
export type OpsRecord = Record<string, RecordValue> & { id?: string };

export type ModuleKey =
  | "operational_emails"
  | "email_templates"
  | "passwords"
  | "supervisors"
  | "employers"
  | "clients"
  | "management_fees"
  | "insurance_discounts"
  | "deposit_accounts"
  | "service_centers"
  | "institution_codes"
  | "links"
  | "agent_numbers"
  | "bank_numbers"
  | "mortgage_release";

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "email" | "url" | "password" | "textarea" | "date";
  hiddenInTable?: boolean;
}

export interface ModuleConfig {
  key: ModuleKey;
  route: string;
  title: string;
  label: string;
  icon: LucideIcon;
  source: "public" | "private";
  file: string;
  fields: FieldConfig[];
  tableFields: string[];
  count?: number;
  cardOnly?: boolean;
}

export const publicModules: ModuleKey[] = [
  "operational_emails",
  "email_templates",
  "management_fees",
  "insurance_discounts",
  "deposit_accounts",
  "service_centers",
  "institution_codes",
  "bank_numbers",
  "mortgage_release",
];

export const privateModules: ModuleKey[] = [
  "passwords",
  "supervisors",
  "employers",
  "clients",
  "agent_numbers",
  "links",
];

export const modules: ModuleConfig[] = [
  {
    key: "operational_emails",
    route: "/emails",
    title: "מיילים תפעוליים",
    label: "מיילים",
    icon: Mail,
    source: "public",
    file: "operational_emails.json",
    count: 84,
    fields: [
      { key: "company", label: "חברה" },
      { key: "department", label: "מחלקה" },
      { key: "category", label: "קטגוריה" },
      { key: "action", label: "פעולה" },
      { key: "email", label: "מייל", type: "email" },
      { key: "notes", label: "הערות", type: "textarea" },
    ],
    tableFields: ["company", "department", "category", "action", "email", "notes"],
  },
  {
    key: "email_templates",
    route: "/templates",
    title: "תבניות מייל",
    label: "תבניות",
    icon: FileText,
    source: "public",
    file: "email_templates.json",
    count: 10,
    fields: [
      { key: "title", label: "שם תבנית" },
      { key: "category", label: "קטגוריה" },
      { key: "subject", label: "נושא" },
      { key: "body", label: "גוף התבנית", type: "textarea" },
    ],
    tableFields: ["title", "category", "subject"],
  },
  {
    key: "passwords",
    route: "/passwords",
    title: "מערכות וסיסמאות",
    label: "סיסמאות",
    icon: Lock,
    source: "private",
    file: "passwords.json",
    fields: [
      { key: "company", label: "חברה" },
      { key: "system", label: "מערכת" },
      { key: "url", label: "URL", type: "url" },
      { key: "username", label: "שם משתמש" },
      { key: "password", label: "סיסמה", type: "password" },
      { key: "notes", label: "הערות", type: "textarea" },
    ],
    tableFields: ["company", "system", "url", "username", "password", "notes"],
  },
  {
    key: "supervisors",
    route: "/supervisors",
    title: "מפקחים",
    label: "מפקחים",
    icon: Users,
    source: "private",
    file: "supervisors.json",
    fields: [
      { key: "company", label: "חברה" },
      { key: "name", label: "שם" },
      { key: "role", label: "תפקיד" },
      { key: "email", label: "מייל", type: "email" },
      { key: "phone", label: "טלפון" },
    ],
    tableFields: ["company", "name", "role", "email", "phone"],
  },
  {
    key: "employers",
    route: "/employers",
    title: "מעסיקים",
    label: "מעסיקים",
    icon: Building2,
    source: "private",
    file: "employers.json",
    fields: [
      { key: "employer", label: "מעסיק" },
      { key: "contact_name", label: "איש קשר" },
      { key: "email", label: "מייל", type: "email" },
      { key: "notes", label: "הערות", type: "textarea" },
    ],
    tableFields: ["employer", "contact_name", "email", "notes"],
  },
  {
    key: "clients",
    route: "/clients",
    title: "לקוחות",
    label: "לקוחות",
    icon: UserCircle,
    source: "private",
    file: "clients.json",
    fields: [
      { key: "first_name", label: "שם" },
      { key: "last_name", label: "משפחה" },
      { key: "national_id", label: "ת.ז" },
      { key: "address", label: "כתובת", type: "textarea" },
      { key: "phone", label: "טלפון" },
      { key: "email", label: "מייל", type: "email" },
      { key: "birth_date", label: "ת. לידה", type: "date" },
      { key: "issue_date", label: "ת. הנפקה", type: "date" },
    ],
    tableFields: ["first_name", "last_name", "national_id", "email"],
  },
  {
    key: "management_fees",
    route: "/fees",
    title: "דמי ניהול",
    label: "דמי ניהול",
    icon: DollarSign,
    source: "public",
    file: "management_fees.json",
    count: 67,
    fields: [
      { key: "company", label: "חברה" },
      { key: "product", label: "מוצר" },
      { key: "range", label: "טווח/שכר" },
      { key: "balance_fee", label: "מצבירה %" },
      { key: "deposit_fee", label: "מהפקדה %" },
      { key: "validity", label: "תוקף" },
    ],
    tableFields: ["range", "balance_fee", "deposit_fee", "validity"],
  },
  {
    key: "insurance_discounts",
    route: "/discounts",
    title: "הנחות ביטוח",
    label: "הנחות ביטוח",
    icon: Shield,
    source: "public",
    file: "insurance_discounts.json",
    count: 59,
    fields: [
      { key: "company", label: "חברה" },
      { key: "product", label: "מוצר" },
      { key: "track", label: "מסלול" },
      { key: "agreement_number", label: "הסכם" },
      { key: "discounts.year1", label: "שנה א׳" },
      { key: "discounts.year2", label: "שנה ב׳" },
      { key: "discounts.year3", label: "שנה ג׳" },
      { key: "discounts.year4", label: "שנה ד׳" },
      { key: "discounts.year5to6", label: "שנים ה׳-ו׳" },
      { key: "validity", label: "תוקף" },
      { key: "notes", label: "הערות", type: "textarea" },
    ],
    tableFields: ["company", "product", "track", "agreement_number", "discounts.year1", "discounts.year2", "discounts.year3", "discounts.year4", "discounts.year5to6", "validity", "notes"],
  },
  {
    key: "deposit_accounts",
    route: "/accounts",
    title: "חשבונות להפקדה",
    label: "חשבונות",
    icon: Landmark,
    source: "public",
    file: "deposit_accounts.json",
    fields: [
      { key: "company", label: "חברה" },
      { key: "product", label: "מוצר" },
      { key: "bank", label: "בנק" },
      { key: "branch", label: "סניף" },
      { key: "account", label: "חשבון" },
      { key: "iban", label: "IBAN" },
      { key: "email", label: "מייל", type: "email" },
      { key: "notes", label: "הערות", type: "textarea" },
    ],
    tableFields: ["company", "product", "bank", "branch", "account", "iban", "email", "notes"],
  },
  {
    key: "service_centers",
    route: "/service-centers",
    title: "מוקדי שירות",
    label: "מוקדי שירות",
    icon: HeadphonesIcon,
    source: "public",
    file: "service_centers.json",
    count: 11,
    fields: [
      { key: "company", label: "חברה" },
      { key: "department", label: "מחלקה" },
      { key: "phone", label: "טלפון" },
      { key: "email", label: "מייל", type: "email" },
      { key: "hours", label: "שעות" },
      { key: "customer_phone", label: "טלפון לקוח" },
    ],
    tableFields: ["company", "department", "phone", "email", "hours", "customer_phone"],
  },
  {
    key: "institution_codes",
    route: "/institution-codes",
    title: "קודי מוסד",
    label: "קודי מוסד",
    icon: Code,
    source: "public",
    file: "institution_codes.json",
    count: 6,
    fields: [
      { key: "company", label: "חברה" },
      { key: "type", label: "סוג" },
      { key: "code", label: "קוד" },
    ],
    tableFields: ["company", "type", "code"],
  },
  {
    key: "links",
    route: "/links",
    title: "קישורים חשובים",
    label: "קישורים",
    icon: Link2,
    source: "private",
    file: "links.json",
    fields: [
      { key: "company", label: "חברה" },
      { key: "name", label: "שם" },
      { key: "url", label: "URL", type: "url" },
      { key: "notes", label: "הערות", type: "textarea" },
    ],
    tableFields: ["company", "name", "url", "notes"],
  },
  {
    key: "agent_numbers",
    route: "/agent-numbers",
    title: "מספרי סוכן",
    label: "מספרי סוכן",
    icon: Hash,
    source: "private",
    file: "agent_numbers.json",
    fields: [
      { key: "company", label: "חברה" },
      { key: "product", label: "מוצר" },
      { key: "agent_number", label: "מספר סוכן" },
    ],
    tableFields: ["company", "product", "agent_number"],
  },
  {
    key: "bank_numbers",
    route: "/bank-numbers",
    title: "מספרי בנקים בישראל",
    label: "מספרי בנקים",
    icon: CreditCard,
    source: "public",
    file: "bank_numbers.json",
    count: 25,
    cardOnly: true,
    fields: [
      { key: "bank_name", label: "בנק" },
      { key: "bank_number", label: "מספר בנק" },
    ],
    tableFields: ["bank_name", "bank_number"],
  },
  {
    key: "mortgage_release",
    route: "/mortgage",
    title: "שחרור משכנתא",
    label: "שחרור משכנתא",
    icon: Home,
    source: "public",
    file: "mortgage_release.json",
    count: 12,
    fields: [
      { key: "entity", label: "גוף" },
      { key: "contact", label: "איש קשר" },
      { key: "type", label: "סוג" },
    ],
    tableFields: ["entity", "contact", "type"],
  },
];

export function moduleByKey(key: ModuleKey) {
  return modules.find((module) => module.key === key);
}

export function moduleByRoute(pathname: string) {
  return modules.find((module) => module.route === pathname);
}

export function getValue(row: OpsRecord, key: string) {
  let value: unknown = row;

  for (const part of key.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return fallbackDottedValue(row, key);
    }
    value = (value as Record<string, RecordValue>)[part];
  }

  return (value ?? fallbackDottedValue(row, key)) as RecordValue;
}

export function setValue(row: OpsRecord, key: string, value: string) {
  const parts = key.split(".");
  if (parts.length === 1) {
    row[key] = value;
    return;
  }

  const [first, ...rest] = parts;
  const nested = row[first];
  const target =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, string | undefined>)
      : {};
  target[rest.join(".")] = value;
  row[first] = target;
}

function fallbackDottedValue(row: OpsRecord, key: string) {
  const lastSegment = key.split(".").pop();
  return lastSegment ? row[lastSegment] ?? "" : "";
}
