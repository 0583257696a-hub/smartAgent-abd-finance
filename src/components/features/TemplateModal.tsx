import Modal from "@/components/ui/Modal";
import type { OpsRecord } from "@/lib/modules";

export default function TemplateModal({
  template,
  onClose,
}: {
  template: OpsRecord | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(template)}
      title={String(template?.title ?? "תבנית")}
      subtitle={String(template?.subject ?? "")}
      onClose={onClose}
    >
      <div style={{
        whiteSpace: "pre-wrap",
        lineHeight: 1.9,
        background: "#F8FAFC",
        border: "1px solid #DDE7F3",
        borderRadius: 14,
        padding: 22,
        color: "var(--text-body)",
        textAlign: "right",
        direction: "rtl",
      }}>
        {String(template?.body ?? "").replace(/\\n/g, "\n")}
      </div>
    </Modal>
  );
}
