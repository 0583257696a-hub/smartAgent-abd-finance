'use client'

import { useEffect, useMemo, useState } from "react";
import { Copy, Edit2, ExternalLink, Eye, EyeOff, Plus, Printer, Send, Trash2 } from "lucide-react";
import DataCards from "@/components/ui/DataCards";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { createPublicRow, deletePublicRow, loadPublicRows, updatePublicRow } from "@/lib/data";
import { addRecord, deleteRecord, getPrivateData, updateRecord } from "@/lib/local-storage";
import { exportToExcel } from "@/lib/excel-export";
import { getValue, moduleByKey, setValue, type FieldConfig, type ModuleKey, type OpsRecord } from "@/lib/modules";
import { normalizeText, searchMatch } from "@/lib/normalize";
import { decodeTemplateText } from "@/lib/template-text";
import { useAppStore } from "@/store/useAppStore";
import TemplateModal from "@/components/features/TemplateModal";
import EmailSendModal from "@/components/features/EmailSendModal";
import ClientModal from "@/components/features/ClientModal";

const userId = "local-dev";

export default function ModulePage({ moduleKey }: { moduleKey: ModuleKey }) {
  const config = moduleByKey(moduleKey);
  const { searchQuery, viewMode, setActiveModule } = useAppStore();
  const [rows, setRows] = useState<OpsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OpsRecord | null>(null);
  const [template, setTemplate] = useState<OpsRecord | null>(null);
  const [sendTemplate, setSendTemplate] = useState<OpsRecord | null>(null);
  const [client, setClient] = useState<OpsRecord | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [feeCompany, setFeeCompany] = useState("");
  const [feeProduct, setFeeProduct] = useState("");

  useEffect(() => {
    if (!config) return;
    const moduleConfig = config;
    let cancelled = false;

    async function loadRows() {
      setActiveModule(moduleConfig.route.replace("/", ""));
      setLoading(true);
      try {
        if (moduleConfig.source === "private") {
          if (!cancelled) setRows(getPrivateData(moduleConfig.key, userId));
        } else {
          const nextRows = await loadPublicRows(moduleConfig);
          if (!cancelled) setRows(nextRows);
        }
      } catch (error) {
        console.error(`Failed to load ${moduleConfig.key}`, error);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRows();
    const reload = () => void loadRows();
    window.addEventListener("ops:data-imported", reload);

    return () => {
      cancelled = true;
      window.removeEventListener("ops:data-imported", reload);
    };
  }, [config, setActiveModule]);

  const filteredRows = useMemo(() => {
    if (!config) return [];
    let output = rows.filter((row) => searchMatch(JSON.stringify(row), searchQuery));

    if (moduleKey === "management_fees") {
      const companies = unique(rows.map((row) => String(row.company ?? "")));
      const company = feeCompany || companies[0] || "";
      const products = unique(rows.filter((row) => !company || row.company === company).map((row) => String(row.product ?? "")));
      const product = feeProduct && products.includes(feeProduct) ? feeProduct : products[0] || "";
      output = output.filter((row) => (!company || row.company === company) && (!product || row.product === product));
    }

    return output;
  }, [config, feeCompany, feeProduct, moduleKey, rows, searchQuery]);

  if (!config) return null;

  const tableFields = config.tableFields.map((key) => config.fields.find((field) => field.key === key)).filter(Boolean) as FieldConfig[];
  const displayAsCards = config.cardOnly || viewMode === "cards";

  async function saveRecord(record: OpsRecord) {
    if (!config) return;
    const id = String(record.id ?? "");

    if (config.source === "private") {
      if (id) {
        updateRecord(config.key, userId, id, record);
      } else {
        addRecord(config.key, userId, record);
      }
      setRows(getPrivateData(config.key, userId));
    } else if (id) {
      const next = await updatePublicRow(config, id, record);
      setRows((current) => current.map((row) => (String(row.id) === id ? next : row)));
    } else {
      const next = await createPublicRow(config, record);
      setRows((current) => [...current, next]);
    }

    setEditing(null);
  }

  async function removeRecord(row: OpsRecord) {
    if (!config || !confirm("למחוק את הרשומה?")) return;
    const id = String(row.id ?? "");

    if (config.source === "private") {
      deleteRecord(config.key, userId, id);
      setRows(getPrivateData(config.key, userId));
    } else {
      await deletePublicRow(config, id);
      setRows((current) => current.filter((item) => String(item.id) !== id));
    }
  }

  function copy(value: unknown) {
    navigator.clipboard.writeText(String(value ?? ""));
  }

  function mailto(value: unknown) {
    window.location.href = `mailto:${encodeURIComponent(String(value ?? ""))}`;
  }

  const actions = (row: OpsRecord, index: number) => (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {moduleKey === "email_templates" && (
        <>
          <Action icon={<Eye size={15} />} label="פתח" onClick={() => setTemplate(row)} />
          <Action icon={<Send size={15} />} label="שלח" primary onClick={() => setSendTemplate(row)} />
          <Action icon={<Copy size={15} />} label="העתק" onClick={() => copy(decodeTemplateText(row.body))} />
        </>
      )}
      {moduleKey !== "email_templates" && row.email && <Action icon={<Copy size={15} />} label="העתק" onClick={() => copy(row.email)} />}
      {moduleKey === "operational_emails" && <Action icon={<Send size={15} />} label="שלח" primary onClick={() => mailto(row.email)} />}
      {moduleKey === "passwords" && (
        <>
          <Action icon={visiblePasswords.has(String(row.id ?? index)) ? <EyeOff size={15} /> : <Eye size={15} />} label="סיסמה" onClick={() => setVisiblePasswords((current) => toggleSet(current, String(row.id ?? index)))} />
          <Action icon={<Copy size={15} />} label="משתמש" onClick={() => copy(row.username)} />
          <Action icon={<Copy size={15} />} label="סיסמה" onClick={() => copy(row.password)} />
        </>
      )}
      {moduleKey === "links" && <Action icon={<ExternalLink size={15} />} label="פתח" onClick={() => window.open(String(row.url ?? ""), "_blank")} />}
      {moduleKey === "agent_numbers" && <Action icon={<Copy size={15} />} label="מספר" onClick={() => copy(row.agent_number)} />}
      {moduleKey === "institution_codes" && <Action icon={<Copy size={15} />} label="קוד" onClick={() => copy(row.code)} />}
      {moduleKey === "bank_numbers" && <Action icon={<Copy size={15} />} label="העתק" onClick={() => copy(row.bank_number)} />}
      {moduleKey === "management_fees" && <Action icon={<Copy size={15} />} label="Copy row" onClick={() => copy(rowText(row))} />}
      <Action icon={<Edit2 size={15} />} label="ערוך" onClick={() => setEditing(row)} />
      <Action icon={<Trash2 size={15} />} label="מחק" danger onClick={() => removeRecord(row)} />
    </div>
  );

  return (
    <section>
      <ModuleToolbar
        title={config.title}
        loading={loading}
        total={filteredRows.length}
        onAdd={() => setEditing({})}
        onExport={() => exportToExcel(config.key, filteredRows)}
      />

      {moduleKey === "management_fees" && (
        <FeesSelector
          rows={rows}
          selectedCompany={feeCompany}
          selectedProduct={feeProduct}
          onCompany={setFeeCompany}
          onProduct={setFeeProduct}
        />
      )}

      {moduleKey === "insurance_discounts" && <DiscountFilters rows={rows} />}

      {moduleKey === "bank_numbers" ? (
        <BankCards rows={filteredRows} onCopy={copy} />
      ) : displayAsCards ? (
        <DataCards
          rows={filteredRows}
          fields={tableFields}
          titleField={config.tableFields[0] ?? config.fields[0]?.key}
          badgeField={config.tableFields[1]}
          actions={actions}
        />
      ) : (
        <DataTable
          rows={filteredRows.map((row, index) => maskRow(row, moduleKey, visiblePasswords.has(String(row.id ?? index))))}
          fields={tableFields}
          actions={actions}
          onRowClick={moduleKey === "clients" ? (row) => setClient(row) : undefined}
        />
      )}

      <RecordModal
        open={Boolean(editing)}
        title={editing?.id ? `עריכת ${config.label}` : `הוספת ${config.label}`}
        fields={config.fields}
        record={editing ?? {}}
        onClose={() => setEditing(null)}
        onSave={saveRecord}
      />

      <TemplateModal template={template} onClose={() => setTemplate(null)} />
      <EmailSendModal template={sendTemplate} onClose={() => setSendTemplate(null)} />
      <ClientModal client={client} onClose={() => setClient(null)} />
    </section>
  );
}

function ModuleToolbar({
  title,
  loading,
  total,
  onAdd,
  onExport,
}: {
  title: string;
  loading: boolean;
  total: number;
  onAdd: () => void;
  onExport: () => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, color: "var(--text-heading)" }}>{title}</h2>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
          {loading ? "טוען נתונים..." : `${total} רשומות`}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Action icon={<Plus size={16} />} label="הוסף" primary onClick={onAdd} />
        <Action icon={<Printer size={16} />} label="Export" onClick={onExport} />
      </div>
    </div>
  );
}

function RecordModal({
  open,
  title,
  fields,
  record,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fields: FieldConfig[];
  record: OpsRecord;
  onClose: () => void;
  onSave: (record: OpsRecord) => void;
}) {
  const [draft, setDraft] = useState<OpsRecord>(record);

  useEffect(() => {
    queueMicrotask(() => setDraft(record));
  }, [record]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
          <button type="button" style={buttonPrimary} onClick={() => onSave(draft)}>שמירה</button>
          <button type="button" style={buttonNeutral} onClick={onClose}>ביטול</button>
        </div>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) {
            event.preventDefault();
            onSave(draft);
          }
        }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}
      >
        {fields.map((field) => {
          const value = String(getValue(draft, field.key) ?? "");
          const common = {
            value,
            placeholder: field.label,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              const next = { ...draft };
              setValue(next, field.key, event.target.value);
              setDraft(next);
            },
            style: inputStyle,
          };

          return (
            <label key={field.key} style={{ display: "grid", gap: 6, color: "var(--text-heading)", fontSize: 13, fontWeight: 700 }}>
              {field.label}
              {field.type === "textarea" ? <textarea {...common} rows={4} /> : <input {...common} type={field.type ?? "text"} />}
            </label>
          );
        })}
      </form>
    </Modal>
  );
}

function FeesSelector({
  rows,
  selectedCompany,
  selectedProduct,
  onCompany,
  onProduct,
}: {
  rows: OpsRecord[];
  selectedCompany: string;
  selectedProduct: string;
  onCompany: (value: string) => void;
  onProduct: (value: string) => void;
}) {
  const companies = unique(rows.map((row) => String(row.company ?? "")));
  const company = selectedCompany || companies[0] || "";
  const products = unique(rows.filter((row) => !company || row.company === company).map((row) => String(row.product ?? "")));
  const product = selectedProduct && products.includes(selectedProduct) ? selectedProduct : products[0] || "";
  const feeRows = rows.filter((row) => row.company === company && row.product === product);
  const validity = unique(feeRows.map((row) => String(row.validity ?? ""))).filter(Boolean).join(" | ") || "לא צוין";

  return (
    <div style={panelStyle}>
      <Pills values={companies} active={company} onSelect={(value) => { onCompany(value); onProduct(""); }} />
      <Pills values={products} active={product} onSelect={onProduct} />
      <div style={{ marginTop: 10 }}>
        <Badge>{company} → {product} | {feeRows.length} מדרגים | תוקף: {validity}</Badge>
      </div>
    </div>
  );
}

function DiscountFilters({ rows }: { rows: OpsRecord[] }) {
  const companies = unique(rows.map((row) => String(row.company ?? ""))).length;
  const products = unique(rows.map((row) => String(row.product ?? ""))).length;
  return <div style={panelStyle}><Badge>{companies} חברות | {products} מוצרים | Matrix Table</Badge></div>;
}

function Pills({ values, active, onSelect }: { values: string[]; active: string; onSelect: (value: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onSelect(value)} style={{
          ...buttonNeutral,
          background: normalizeText(value) === normalizeText(active) ? "var(--primary)" : "#fff",
          color: normalizeText(value) === normalizeText(active) ? "#fff" : "var(--text-body)",
        }}>
          {value}
        </button>
      ))}
    </div>
  );
}

function BankCards({ rows, onCopy }: { rows: OpsRecord[]; onCopy: (value: unknown) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
      {rows.map((row, index) => (
        <article key={String(row.id ?? index)} style={{
          position: "relative",
          minHeight: 150,
          border: "1px solid #DDE7F3",
          borderRadius: "var(--radius-card)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
          display: "grid",
          placeItems: "center",
          padding: 18,
        }}>
          <span style={{ position: "absolute", top: 14, right: 16, fontWeight: 800, color: "var(--text-heading)" }}>
            {String(row.bank_name ?? "")}
          </span>
          <strong style={{ fontSize: 44, color: "var(--primary)", lineHeight: 1 }}>{String(row.bank_number ?? "")}</strong>
          <button type="button" onClick={() => onCopy(row.bank_number)} style={{ ...buttonNeutral, position: "absolute", bottom: 12, left: 12 }}>
            העתק
          </button>
        </article>
      ))}
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  primary,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} style={{
      border: `1px solid ${danger ? "#FECACA" : "#D8E4F2"}`,
      background: primary ? "var(--accent)" : danger ? "#FFF1F2" : "#fff",
      color: primary ? "#fff" : danger ? "var(--status-blocked)" : "var(--primary)",
      borderRadius: 9,
      padding: "7px 9px",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      fontWeight: 800,
      fontFamily: "var(--font-main)",
      cursor: "pointer",
    }}>
      {icon}
      {label}
    </button>
  );
}

function maskRow(row: OpsRecord, moduleKey: ModuleKey, showPassword: boolean) {
  if (moduleKey === "passwords" && !showPassword) return { ...row, password: "••••••" };
  if (moduleKey === "clients") {
    const nationalId = String(row.national_id ?? "");
    return {
      ...row,
      first_name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      national_id: nationalId.length > 2 ? `${nationalId.slice(0, 2)}${"*".repeat(Math.max(nationalId.length - 2, 4))}` : nationalId,
    };
  }
  return row;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function toggleSet(set: Set<string>, key: string) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function rowText(row: OpsRecord) {
  return Object.entries(row)
    .filter(([key]) => key !== "id")
    .map(([key, value]) => `${key}: ${String(value ?? "")}`)
    .join(" | ");
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
  color: "var(--text-body)",
  fontFamily: "var(--font-main)",
  outline: "none",
};

const buttonPrimary: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "10px 18px",
  background: "var(--accent)",
  color: "#fff",
  fontFamily: "var(--font-main)",
  fontWeight: 800,
  cursor: "pointer",
};

const buttonNeutral: React.CSSProperties = {
  border: "1px solid #D8E4F2",
  borderRadius: 10,
  padding: "9px 13px",
  background: "#fff",
  color: "var(--text-body)",
  fontFamily: "var(--font-main)",
  fontWeight: 800,
  cursor: "pointer",
};

const panelStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid #DDE7F3",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
  padding: 14,
  marginBottom: 16,
};
