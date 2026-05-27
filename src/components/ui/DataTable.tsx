import type { FieldConfig, OpsRecord } from "@/lib/modules";
import { getValue } from "@/lib/modules";

export default function DataTable({
  rows,
  fields,
  actions,
  onRowClick,
}: {
  rows: OpsRecord[];
  fields: FieldConfig[];
  actions?: (row: OpsRecord, index: number) => React.ReactNode;
  onRowClick?: (row: OpsRecord, index: number) => void;
}) {
  return (
    <div style={{
      overflow: "auto",
      background: "var(--bg-card)",
      border: "1px solid #DDE7F3",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card)",
      maxHeight: "calc(100vh - 190px)",
    }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 760 }}>
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field.key} style={thStyle}>{field.label}</th>
            ))}
            {actions && <th style={thStyle}>פעולות</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String(row.id ?? index)}
              onClick={() => onRowClick?.(row, index)}
              style={{
                background: index % 2 ? "#F8FAFC" : "#fff",
                cursor: onRowClick ? "pointer" : "default",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "#EEF5FF";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = index % 2 ? "#F8FAFC" : "#fff";
              }}
            >
              {fields.map((field) => (
                <td key={field.key} style={tdStyle}>
                  {field.type === "password" ? "••••••" : String(getValue(row, field.key) ?? "")}
                </td>
              ))}
              {actions && <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{actions(row, index)}</td>}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={fields.length + (actions ? 1 : 0)} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted)" }}>
                לא נמצאו רשומות
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#F1F6FC",
  color: "var(--text-heading)",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "right",
  padding: "14px 16px",
  borderBottom: "1px solid #D6E2F0",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #EAF0F7",
  color: "var(--text-body)",
  fontSize: 13.5,
  lineHeight: 1.45,
  verticalAlign: "middle",
};
