'use client'

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  Send,
  Trash2,
  Users,
} from "lucide-react";
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

const moduleTitle: Partial<Record<ModuleKey, { title: string; label: string }>> = {
  operational_emails: { title: "מיילים תפעוליים", label: "מיילים" },
  email_templates: { title: "תבניות מייל", label: "תבניות" },
  passwords: { title: "פוליסות וסיסמאות", label: "סיסמאות" },
  supervisors: { title: "מפקחים", label: "מפקחים" },
  employers: { title: "עסקים", label: "עסקים" },
  clients: { title: "לקוחות", label: "לקוחות" },
  management_fees: { title: "דמי ניהול", label: "דמי ניהול" },
  insurance_discounts: { title: "הנחות ביטוח", label: "הנחות ביטוח" },
  deposit_accounts: { title: "חשבונות להפקדה", label: "חשבונות" },
  service_centers: { title: "מוקדי שירות", label: "מוקדי שירות" },
  institution_codes: { title: "קודי מוסד", label: "קודי מוסד" },
  links: { title: "קישורים חשובים", label: "קישורים" },
  agent_numbers: { title: "מספרי סוכן", label: "מספרי סוכן" },
  bank_numbers: { title: "מספרי בנקים בישראל", label: "מספרי בנקים" },
  mortgage_release: { title: "שחרור משכנתא", label: "שחרור משכנתא" },
};

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
  const [localSearch, setLocalSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

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

    if (moduleKey === "operational_emails") {
      output = output.filter((row) =>
        searchMatch(JSON.stringify(row), localSearch) &&
        matchesFilter(row.company, companyFilter) &&
        matchesFilter(row.department, departmentFilter) &&
        matchesFilter(row.category, categoryFilter)
      );
    }

    if (moduleKey === "management_fees") {
      const companies = unique(rows.map((row) => String(row.company ?? "")));
      const company = feeCompany || companies[0] || "";
      const products = unique(rows.filter((row) => !company || row.company === company).map((row) => String(row.product ?? "")));
      const product = feeProduct && products.includes(feeProduct) ? feeProduct : products[0] || "";
      output = output.filter((row) => (!company || row.company === company) && (!product || row.product === product));
    }

    return output;
  }, [categoryFilter, companyFilter, config, departmentFilter, feeCompany, feeProduct, localSearch, moduleKey, rows, searchQuery]);

  if (!config) return null;

  const moduleConfig = config;
  const title = moduleTitle[moduleKey]?.title ?? moduleConfig.title;
  const label = moduleTitle[moduleKey]?.label ?? moduleConfig.label;
  const tableFields = moduleConfig.tableFields.map((key) => moduleConfig.fields.find((field) => field.key === key)).filter(Boolean) as FieldConfig[];
  const displayAsCards = moduleConfig.cardOnly || viewMode === "cards";
  const emailCompanies = unique(rows.map((row) => String(row.company ?? "")));
  const emailDepartments = unique(rows.map((row) => String(row.department ?? "")));
  const emailCategories = unique(rows.map((row) => String(row.category ?? "")));

  async function saveRecord(record: OpsRecord) {
    const id = String(record.id ?? "");

    if (moduleConfig.source === "private") {
      if (id) updateRecord(moduleConfig.key, userId, id, record);
      else addRecord(moduleConfig.key, userId, record);
      setRows(getPrivateData(moduleConfig.key, userId));
    } else if (id) {
      const next = await updatePublicRow(moduleConfig, id, record);
      setRows((current) => current.map((row) => (String(row.id) === id ? next : row)));
    } else {
      const next = await createPublicRow(moduleConfig, record);
      setRows((current) => [...current, next]);
    }

    setEditing(null);
  }

  async function removeRecord(row: OpsRecord) {
    if (!confirm("למחוק את הרשומה?")) return;
    const id = String(row.id ?? "");

    if (moduleConfig.source === "private") {
      deleteRecord(moduleConfig.key, userId, id);
      setRows(getPrivateData(moduleConfig.key, userId));
    } else {
      await deletePublicRow(moduleConfig, id);
      setRows((current) => current.filter((item) => String(item.id) !== id));
    }
  }

  function copy(value: unknown) {
    navigator.clipboard.writeText(String(value ?? ""));
  }

  function mailto(value: unknown) {
    window.location.href = `mailto:${encodeURIComponent(String(value ?? ""))}`;
  }

  const actions = (row: OpsRecord, index: number) => {
    const rowKey = String(row.id ?? index);

    if (moduleKey === "operational_emails") {
      return (
        <RowActions
          rowKey={rowKey}
          open={openActionMenu === rowKey}
          onToggle={() => setOpenActionMenu((current) => current === rowKey ? null : rowKey)}
          onSend={() => mailto(row.email)}
          onCopy={() => copy(row.email)}
          onEdit={() => setEditing(row)}
          onDelete={() => removeRecord(row)}
        />
      );
    }

    return (
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {moduleKey === "email_templates" && (
          <>
            <Action icon={<Eye size={15} />} label="פתח" onClick={() => setTemplate(row)} />
            <Action icon={<Send size={15} />} label="שלח" primary onClick={() => setSendTemplate(row)} />
            <Action icon={<Copy size={15} />} label="העתק" onClick={() => copy(decodeTemplateText(row.body))} />
          </>
        )}
        {moduleKey !== "email_templates" && row.email && <Action icon={<Copy size={15} />} label="העתק" onClick={() => copy(row.email)} />}
        {moduleKey === "passwords" && (
          <>
            <Action icon={visiblePasswords.has(rowKey) ? <EyeOff size={15} /> : <Eye size={15} />} label="סיסמה" onClick={() => setVisiblePasswords((current) => toggleSet(current, rowKey))} />
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
  };

  return (
    <section className="ops-page-shell">
      {moduleKey === "operational_emails" ? (
        <EmailsHeader
          title={title}
          loading={loading}
          rows={rows}
          filteredTotal={filteredRows.length}
          localSearch={localSearch}
          companyFilter={companyFilter}
          departmentFilter={departmentFilter}
          categoryFilter={categoryFilter}
          companies={emailCompanies}
          departments={emailDepartments}
          categories={emailCategories}
          onLocalSearch={setLocalSearch}
          onCompany={setCompanyFilter}
          onDepartment={setDepartmentFilter}
          onCategory={setCategoryFilter}
          onAdd={() => setEditing({})}
          onExport={() => exportToExcel(moduleConfig.key, filteredRows)}
        />
      ) : (
        <ModuleToolbar
          title={title}
          loading={loading}
          total={filteredRows.length}
          onAdd={() => setEditing({})}
          onExport={() => exportToExcel(moduleConfig.key, filteredRows)}
        />
      )}

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
          titleField={moduleConfig.tableFields[0] ?? moduleConfig.fields[0]?.key}
          badgeField={moduleConfig.tableFields[1]}
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
        title={editing?.id ? `עריכת ${label}` : `הוספת ${label}`}
        fields={moduleConfig.fields}
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

function EmailsHeader({
  title,
  loading,
  rows,
  filteredTotal,
  localSearch,
  companyFilter,
  departmentFilter,
  categoryFilter,
  companies,
  departments,
  categories,
  onLocalSearch,
  onCompany,
  onDepartment,
  onCategory,
  onAdd,
  onExport,
}: {
  title: string;
  loading: boolean;
  rows: OpsRecord[];
  filteredTotal: number;
  localSearch: string;
  companyFilter: string;
  departmentFilter: string;
  categoryFilter: string;
  companies: string[];
  departments: string[];
  categories: string[];
  onLocalSearch: (value: string) => void;
  onCompany: (value: string) => void;
  onDepartment: (value: string) => void;
  onCategory: (value: string) => void;
  onAdd: () => void;
  onExport: () => void;
}) {
  const frequentEmails = rows.filter((row) => String(row.email ?? "").includes("@")).length;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: "var(--text-heading)", fontSize: 32, lineHeight: 1.2, fontWeight: 900 }}>
            {title}
          </h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 14, fontWeight: 700 }}>
            {loading ? "טוען נתונים..." : `${filteredTotal} רשומות`}
          </p>
        </div>
      </div>

      <div className="ops-kpi-grid">
        <KpiCard icon={<Mail size={22} />} title="סך מיילים" note="סך המיילים התפעוליים" value={rows.length} />
        <KpiCard icon={<Building2 size={22} />} title="חברות" note="חברות ומוסדות" value={companies.length} />
        <KpiCard icon={<Users size={22} />} title="מחלקות" note="מחלקות פעילות" value={departments.length || categories.length} />
        <KpiCard icon={<Send size={22} />} title="מיילים נפוצים" note="שמישים לעבודה שוטפת" value={frequentEmails} />
      </div>

      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: 16,
      }}>
        <div className="ops-filter-grid">
          <FieldSearch value={localSearch} onChange={onLocalSearch} />
          <FilterSelect label="חברה" value={companyFilter} values={companies} onChange={onCompany} />
          <FilterSelect label="מחלקה" value={departmentFilter} values={departments} onChange={onDepartment} />
          <FilterSelect label="קטגוריה" value={categoryFilter} values={categories} onChange={onCategory} />
          <button type="button" style={buttonNeutral} onClick={onExport}>
            <Printer size={16} />
            Export
          </button>
          <button type="button" style={buttonPrimary} onClick={onAdd}>
            <Plus size={17} />
            הוסף מייל
          </button>
        </div>
      </div>
    </>
  );
}

function FieldSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={filterLabel}>חיפוש</span>
      <div style={{ position: "relative" }}>
        <Mail size={17} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="חיפוש במיילים, מייל, הערות..."
          style={{ ...inputStyle, height: 46, paddingRight: 42 }}
        />
      </div>
    </label>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={filterLabel}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={{ ...inputStyle, height: 46 }}>
        <option value="">הכל</option>
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

function KpiCard({
  icon,
  title,
  note,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  value: number;
}) {
  return (
    <article style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-soft)",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card)",
      padding: 20,
      minHeight: 132,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    }}>
      <span style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        background: "var(--accent-light)",
        color: "var(--accent)",
      }}>
        {icon}
      </span>
      <div style={{ textAlign: "right" }}>
        <p style={{ margin: 0, color: "var(--text-heading)", fontSize: 15, fontWeight: 900 }}>{title}</p>
        <p style={{ margin: "4px 0 18px", color: "var(--text-muted)", fontSize: 12, fontWeight: 700 }}>{note}</p>
        <strong style={{ color: "var(--text-heading)", fontSize: 30, lineHeight: 1, fontWeight: 900 }}>{value}</strong>
      </div>
    </article>
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
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 16,
      background: "var(--bg-card)",
      border: "1px solid var(--border-soft)",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card)",
      padding: 20,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, color: "var(--text-heading)", fontWeight: 900 }}>{title}</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 14, fontWeight: 700 }}>
          {loading ? "טוען נתונים..." : `${total} רשומות`}
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" style={buttonPrimary} onClick={onAdd}><Plus size={17} />הוסף</button>
        <button type="button" style={buttonNeutral} onClick={onExport}><Printer size={16} />Export</button>
      </div>
    </div>
  );
}

function RowActions({
  rowKey,
  open,
  onToggle,
  onSend,
  onCopy,
  onEdit,
  onDelete,
}: {
  rowKey: string;
  open: boolean;
  onToggle: () => void;
  onSend: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, position: "relative" }}>
      <button type="button" style={smallPrimary} onClick={(event) => { event.stopPropagation(); onSend(); }}>
        <Send size={15} />
        שלח
      </button>
      <button type="button" aria-label={`פעולות ${rowKey}`} style={dotsButton} onClick={(event) => { event.stopPropagation(); onToggle(); }}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div style={rowMenu}>
          <MenuAction icon={<Edit2 size={15} />} label="עריכה" onClick={onEdit} />
          <MenuAction icon={<Copy size={15} />} label="העתקה" onClick={onCopy} />
          <MenuAction icon={<Trash2 size={15} />} label="מחיקה" danger onClick={onDelete} />
        </div>
      )}
    </div>
  );
}

function MenuAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      border: 0,
      background: "transparent",
      color: danger ? "var(--status-blocked)" : "var(--text-body)",
      padding: "9px 10px",
      borderRadius: 9,
      cursor: "pointer",
      fontWeight: 800,
      textAlign: "right",
    }}>
      {icon}
      {label}
    </button>
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
            <label key={field.key} style={{ display: "grid", gap: 6, color: "var(--text-heading)", fontSize: 13, fontWeight: 800 }}>
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
          background: normalizeText(value) === normalizeText(active) ? "var(--accent)" : "#fff",
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
          minHeight: 160,
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-card)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
          display: "grid",
          placeItems: "center",
          padding: 18,
        }}>
          <span style={{ position: "absolute", top: 14, right: 16, fontWeight: 900, color: "var(--text-heading)" }}>
            {String(row.bank_name ?? "")}
          </span>
          <strong style={{ fontSize: 48, color: "var(--accent)", lineHeight: 1 }}>{String(row.bank_number ?? "")}</strong>
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
      border: `1px solid ${danger ? "#FECACA" : "var(--border-soft)"}`,
      background: primary ? "var(--accent)" : danger ? "#FFF1F2" : "#fff",
      color: primary ? "#fff" : danger ? "var(--status-blocked)" : "var(--primary)",
      borderRadius: 10,
      padding: "7px 10px",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      fontWeight: 800,
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

function matchesFilter(value: unknown, filter: string) {
  return !filter || normalizeText(String(value ?? "")) === normalizeText(filter);
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
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "#fff",
  color: "var(--text-body)",
  outline: "none",
  boxShadow: "0 1px 0 rgba(16,33,63,0.02)",
};

const filterLabel: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 800,
};

const buttonPrimary: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  padding: "11px 18px",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const buttonNeutral: React.CSSProperties = {
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  padding: "10px 15px",
  background: "#fff",
  color: "var(--primary)",
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const smallPrimary: React.CSSProperties = {
  ...buttonPrimary,
  padding: "8px 13px",
  borderRadius: 10,
  fontSize: 13,
};

const dotsButton: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  background: "#fff",
  color: "var(--primary)",
  display: "inline-grid",
  placeItems: "center",
  cursor: "pointer",
};

const rowMenu: React.CSSProperties = {
  position: "absolute",
  top: 42,
  left: 0,
  width: 140,
  background: "#fff",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  boxShadow: "var(--shadow-hover)",
  padding: 6,
  zIndex: 10,
};

const panelStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-soft)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
  padding: 16,
};
