import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import Modal from "@/components/ui/Modal";
import SearchBar from "@/components/ui/SearchBar";
import { loadPublicRows } from "@/lib/data";
import { getPrivateData, getUserSetting } from "@/lib/local-storage";
import { moduleByKey, type OpsRecord } from "@/lib/modules";
import { searchMatch } from "@/lib/normalize";
import { decodeTemplateText, toMailBody } from "@/lib/template-text";

const userId = "local-dev";

export default function EmailSendModal({
  template,
  onClose,
}: {
  template: OpsRecord | null;
  onClose: () => void;
}) {
  const [clients, setClients] = useState<OpsRecord[]>([]);
  const [emails, setEmails] = useState<OpsRecord[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<OpsRecord | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!template) return;
    void Promise.resolve().then(async () => {
      setClients(getPrivateData("clients", userId));
      const config = moduleByKey("operational_emails");
      if (config) setEmails(await loadPublicRows(config));
    });
  }, [template]);

  const filteredClients = useMemo(
    () => clients.filter((client) => searchMatch(JSON.stringify(client), clientQuery)),
    [clientQuery, clients],
  );
  const filteredEmails = useMemo(
    () => emails.filter((email) => searchMatch(JSON.stringify(email), emailQuery || String(template?.category ?? ""))),
    [emailQuery, emails, template],
  );

  function send() {
    const targets = emails
      .filter((row) => selectedEmails.has(String(row.id)))
      .map((row) => String(row.email ?? ""))
      .filter(Boolean);
    if (!template || !targets.length) return;

    const fullName = `${selectedClient?.first_name ?? ""} ${selectedClient?.last_name ?? ""}`.trim();
    const nationalId = String(selectedClient?.national_id ?? "").trim();
    const subject = [fullName, nationalId ? `ת.ז ${nationalId}` : "", decodeTemplateText(template.subject)].filter(Boolean).join(" ");
    const signature = getUserSetting("signature", userId);
    const body = [toMailBody(template.body), toMailBody(signature)].filter(Boolean).join("\r\n\r\n");
    const archive = getUserSetting("archive_email", userId);
    const cc = archive ? `&cc=${encodeURIComponent(archive)}` : "";

    window.location.href = `mailto:${targets.map(encodeURIComponent).join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${cc}`;
  }

  return (
    <Modal open={Boolean(template)} title="בחירת יעד לשליחת המייל" subtitle={String(template?.title ?? "")} onClose={onClose}>
      <div style={{ display: "grid", gap: 16 }}>
        <section style={panel}>
          <h3 style={heading}>1. בחירת לקוח</h3>
          <SearchBar value={clientQuery} onChange={setClientQuery} placeholder="חיפוש לקוח / ת.ז / מייל..." />
          <div style={list}>
            {filteredClients.map((client) => (
              <button key={String(client.id)} type="button" onClick={() => setSelectedClient(client)} style={rowButton(selectedClient?.id === client.id)}>
                {`${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()} · {String(client.national_id ?? "")} · {String(client.email ?? "")}
              </button>
            ))}
            {!filteredClients.length && <p style={empty}>אין לקוחות תואמים</p>}
          </div>
        </section>

        <section style={panel}>
          <h3 style={heading}>2. בחירת נמענים</h3>
          <SearchBar value={emailQuery} onChange={setEmailQuery} placeholder="חיפוש חברה / מחלקה / קטגוריה / מייל..." />
          <div style={list}>
            {filteredEmails.slice(0, 80).map((email) => {
              const key = String(email.id);
              const selected = selectedEmails.has(key);
              return (
                <button key={key} type="button" onClick={() => setSelectedEmails((current) => toggle(current, key))} style={rowButton(selected)}>
                  <strong>{String(email.company ?? "")}</strong>
                  <span>{String(email.department ?? email.category ?? "")} · {String(email.action ?? "")}</span>
                  <span dir="ltr">{String(email.email ?? "")}</span>
                </button>
              );
            })}
          </div>
        </section>

        <button type="button" onClick={send} style={buttonPrimary}>
          <Send size={16} />
          שלח
        </button>
      </div>
    </Modal>
  );
}

function toggle(set: Set<string>, key: string) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function rowButton(selected: boolean): React.CSSProperties {
  return {
    width: "100%",
    border: `1px solid ${selected ? "#93C5FD" : "#DDE7F3"}`,
    borderRadius: 12,
    background: selected ? "#EFF6FF" : "#fff",
    color: "var(--text-body)",
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    cursor: "pointer",
    fontFamily: "var(--font-main)",
    textAlign: "right",
  };
}

const panel: React.CSSProperties = {
  border: "1px solid #DDE7F3",
  borderRadius: 14,
  padding: 14,
  background: "#F8FAFC",
};

const heading: React.CSSProperties = {
  margin: "0 0 10px",
  color: "var(--text-heading)",
  fontSize: 15,
};

const list: React.CSSProperties = {
  display: "grid",
  gap: 8,
  maxHeight: 240,
  overflow: "auto",
  marginTop: 12,
};

const empty: React.CSSProperties = {
  color: "var(--text-muted)",
  textAlign: "center",
};

const buttonPrimary: React.CSSProperties = {
  justifySelf: "start",
  border: 0,
  borderRadius: 10,
  padding: "12px 22px",
  background: "var(--status-active)",
  color: "#fff",
  fontFamily: "var(--font-main)",
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};
