import { Copy, Mail } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { OpsRecord } from "@/lib/modules";

const fields = [
  ["first_name", "שם"],
  ["last_name", "משפחה"],
  ["national_id", "ת.ז"],
  ["address", "כתובת"],
  ["phone", "טלפון"],
  ["email", "מייל"],
  ["birth_date", "ת. לידה"],
  ["issue_date", "ת. הנפקה"],
] as const;

export default function ClientModal({
  client,
  onClose,
}: {
  client: OpsRecord | null;
  onClose: () => void;
}) {
  const email = String(client?.email ?? "");

  return (
    <Modal
      open={Boolean(client)}
      title={`${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim() || "פרטי לקוח"}
      subtitle="פרטים מלאים"
      onClose={onClose}
      footer={
        <button type="button" onClick={() => { if (email) window.location.href = `mailto:${encodeURIComponent(email)}`; }} style={buttonPrimary}>
          <Mail size={16} />
          שלח מייל ללקוח
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {fields.map(([key, label]) => (
          <div key={key} style={{
            border: "1px solid #DDE7F3",
            borderRadius: 12,
            padding: 12,
            background: "#F8FAFC",
          }}>
            <span style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 800 }}>{label}</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ color: "var(--text-heading)", overflowWrap: "anywhere" }}>{String(client?.[key] ?? "")}</strong>
              <button type="button" aria-label={`העתק ${label}`} onClick={() => navigator.clipboard.writeText(String(client?.[key] ?? ""))} style={iconOnly}>
                <Copy size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

const iconOnly: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--accent)",
  cursor: "pointer",
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
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};
