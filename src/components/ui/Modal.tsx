import { X } from "lucide-react";

export default function Modal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,25,41,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        width: "min(880px, 100%)",
        maxHeight: "calc(100vh - 32px)",
        overflow: "auto",
        background: "var(--bg-card)",
        borderRadius: 20,
        boxShadow: "0 24px 70px rgba(15,25,41,0.28)",
        border: "1px solid #E2E8F0",
      }}>
        <header style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "22px 24px 14px",
          borderBottom: "1px solid #E2E8F0",
        }}>
          <div>
            <h2 style={{ margin: 0, color: "var(--text-heading)", fontSize: 22, fontWeight: 800 }}>{title}</h2>
            {subtitle && <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="סגור" style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "var(--text-muted)",
          }}>
            <X size={20} />
          </button>
        </header>
        <div style={{ padding: 24 }}>{children}</div>
        {footer && <footer style={{ padding: "14px 24px 22px", borderTop: "1px solid #E2E8F0" }}>{footer}</footer>}
      </div>
    </div>
  );
}
