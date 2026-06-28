'use client'

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Mail } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = rows.length ? (safePage - 1) * pageSize : 0;
  const end = Math.min(start + pageSize, rows.length);

  const pageRows = useMemo(() => rows.slice(start, end), [end, rows, start]);

  function copy(value: unknown) {
    navigator.clipboard.writeText(String(value ?? ""));
  }

  return (
    <>
      <div className="ops-desktop-table" style={{
        overflow: "auto",
        background: "var(--bg-card)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
      }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 900 }}>
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.key} style={thStyle}>{field.label}</th>
              ))}
              {actions && <th style={{ ...thStyle, width: 150 }}>פעולות</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => {
              const absoluteIndex = start + index;
              return (
                <tr
                  key={String(row.id ?? absoluteIndex)}
                  onClick={() => onRowClick?.(row, absoluteIndex)}
                  style={{
                    background: absoluteIndex % 2 ? "#FBFCFE" : "#fff",
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background 140ms ease",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = "#F3F7FF";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = absoluteIndex % 2 ? "#FBFCFE" : "#fff";
                  }}
                >
                  {fields.map((field) => (
                    <td key={field.key} style={tdStyle}>
                      <CellValue field={field} row={row} onCopy={copy} />
                    </td>
                  ))}
                  {actions && <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{actions(row, absoluteIndex)}</td>}
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={fields.length + (actions ? 1 : 0)} style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted)", padding: 28 }}>
                  לא נמצאו רשומות
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          rows={rows.length}
          start={start}
          end={end}
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>

      <div className="ops-mobile-cards">
        {pageRows.map((row, index) => {
          const absoluteIndex = start + index;
          return (
            <article key={String(row.id ?? absoluteIndex)} style={mobileCard}>
              <div style={{ display: "grid", gap: 10 }}>
                {fields.map((field) => (
                  <div key={field.key} style={{ display: "grid", gap: 4 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 800 }}>{field.label}</span>
                    <CellValue field={field} row={row} onCopy={copy} />
                  </div>
                ))}
              </div>
              {actions && <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>{actions(row, absoluteIndex)}</div>}
            </article>
          )
        })}
      </div>
    </>
  );
}

function CellValue({
  field,
  row,
  onCopy,
}: {
  field: FieldConfig;
  row: OpsRecord;
  onCopy: (value: unknown) => void;
}) {
  const value = field.type === "password" ? "••••••" : String(getValue(row, field.key) ?? "");
  const isBadge = field.key.includes("department") || field.key.includes("category");
  const isEmail = field.type === "email" || field.key === "email";

  if (isEmail && value) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, direction: "ltr", color: "var(--primary)", fontWeight: 600 }}>
        <Mail size={15} color="var(--text-muted)" />
        <span style={{ overflowWrap: "anywhere" }}>{value}</span>
        <button type="button" onClick={(event) => { event.stopPropagation(); onCopy(value); }} style={iconGhost} aria-label="העתקת מייל">
          <Copy size={14} />
        </button>
      </span>
    );
  }

  if (isBadge && value) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        borderRadius: 8,
        padding: "4px 10px",
        background: field.key.includes("department") ? "#EAF2FF" : pastelFor(value).background,
        color: field.key.includes("department") ? "var(--accent)" : pastelFor(value).color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}>
        {value}
      </span>
    );
  }

  return (
    <span style={{
      color: field.key.includes("notes") ? "var(--text-muted)" : "var(--text-body)",
      fontSize: field.key.includes("notes") ? 12.5 : 13.5,
      overflowWrap: "anywhere",
      fontWeight: field.key.includes("company") ? 700 : 500,
    }}>
      {value || "—"}
    </span>
  );
}

function Pagination({
  rows,
  start,
  end,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
}: {
  rows: number;
  start: number;
  end: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
}) {
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => index + 1);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "14px 18px",
      borderTop: "1px solid var(--border-subtle)",
      color: "var(--text-muted)",
      fontSize: 13,
    }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
        שורות לעמוד
        <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))} style={selectStyle}>
          {[10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>

      <span style={{ fontWeight: 700 }}>
        {rows ? `${start + 1}-${end} מתוך ${rows}` : "0 מתוך 0"}
      </span>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <button type="button" style={pagerButton} disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))}>
          <ChevronRight size={16} />
        </button>
        {pages.map((value) => (
          <button key={value} type="button" onClick={() => onPage(value)} style={{
            ...pagerButton,
            background: page === value ? "var(--accent)" : "#fff",
            color: page === value ? "#fff" : "var(--text-body)",
            borderColor: page === value ? "var(--accent)" : "var(--border-soft)",
          }}>
            {value}
          </button>
        ))}
        {pageCount > 5 && <span style={{ padding: "0 4px" }}>...</span>}
        <button type="button" style={pagerButton} disabled={page >= pageCount} onClick={() => onPage(Math.min(pageCount, page + 1))}>
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}

function pastelFor(value: string) {
  const palette = [
    ["#F0F4FF", "#4F46E5"],
    ["#ECFDF5", "#059669"],
    ["#FFF7ED", "#EA580C"],
    ["#FDF2F8", "#DB2777"],
    ["#ECFEFF", "#0891B2"],
  ];
  const index = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  const [background, color] = palette[index];
  return { background, color };
}

const thStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#F8FAFD",
  color: "var(--text-heading)",
  fontSize: 12,
  fontWeight: 900,
  textAlign: "right",
  padding: "14px 16px",
  borderBottom: "1px solid var(--border-soft)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border-subtle)",
  color: "var(--text-body)",
  fontSize: 13.5,
  lineHeight: 1.45,
  verticalAlign: "middle",
};

const iconGhost: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  padding: 2,
  display: "inline-flex",
};

const pagerButton: React.CSSProperties = {
  minWidth: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  background: "#fff",
  color: "var(--text-body)",
  display: "inline-grid",
  placeItems: "center",
  cursor: "pointer",
  fontWeight: 800,
};

const selectStyle: React.CSSProperties = {
  border: "1px solid var(--border-soft)",
  borderRadius: 10,
  background: "#fff",
  color: "var(--text-body)",
  padding: "7px 10px",
  fontWeight: 800,
};

const mobileCard: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-soft)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
  padding: 16,
};
