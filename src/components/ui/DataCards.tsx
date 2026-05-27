import type { FieldConfig, OpsRecord } from "@/lib/modules";
import { getValue } from "@/lib/modules";
import Badge from "@/components/ui/Badge";

export default function DataCards({
  rows,
  fields,
  titleField,
  badgeField,
  actions,
}: {
  rows: OpsRecord[];
  fields: FieldConfig[];
  titleField: string;
  badgeField?: string;
  actions?: (row: OpsRecord, index: number) => React.ReactNode;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
      gap: 14,
    }}>
      {rows.map((row, index) => (
        <article key={String(row.id ?? index)} style={{
          background: "var(--bg-card)",
          border: "1px solid #DDE7F3",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
          padding: 18,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--text-heading)" }}>
              {String(getValue(row, titleField) ?? "רשומה")}
            </h3>
            {badgeField && <Badge>{String(getValue(row, badgeField) ?? "")}</Badge>}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {fields.map((field) => (
              <div key={field.key} style={{ display: "grid", gap: 2 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 700 }}>{field.label}</span>
                <span style={{ color: "var(--text-body)", fontSize: 13.5, overflowWrap: "anywhere" }}>
                  {field.type === "password" ? "••••••" : String(getValue(row, field.key) ?? "")}
                </span>
              </div>
            ))}
          </div>
          {actions && <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>{actions(row, index)}</div>}
        </article>
      ))}
    </div>
  );
}
