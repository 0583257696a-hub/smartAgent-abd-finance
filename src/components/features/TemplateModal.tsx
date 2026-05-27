import Modal from "@/components/ui/Modal";
import type { OpsRecord } from "@/lib/modules";
import { decodeTemplateText } from "@/lib/template-text";

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
      subtitle={decodeTemplateText(template?.subject)}
      onClose={onClose}
    >
      <div style={{
        whiteSpace: "pre-wrap",
        lineHeight: 1.85,
        background: "#F8FAFC",
        border: "1px solid #DDE7F3",
        borderRadius: 14,
        padding: 22,
        color: "var(--text-body)",
        textAlign: "right",
        direction: "rtl",
        unicodeBidi: "plaintext",
        fontSize: 15.5,
      }}>
        {decodeTemplateText(template?.body)}
      </div>
    </Modal>
  );
}
