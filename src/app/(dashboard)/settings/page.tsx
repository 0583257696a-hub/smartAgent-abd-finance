'use client'

import { useState } from "react";
import ImportExcel from "@/components/features/ImportExcel";
import { downloadTemplate, exportBackupExcel, exportBackupJson } from "@/lib/excel-export";
import { getUserSetting, setUserSetting } from "@/lib/local-storage";

const userId = "local-dev";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ full_name: "", phone: "", agency_name: "" });
  const [signature, setSignature] = useState(() => (typeof window === "undefined" ? "" : getUserSetting("signature", userId)));
  const [archiveEmail, setArchiveEmail] = useState(() => (typeof window === "undefined" ? "" : getUserSetting("archive_email", userId)));
  const [exportingExcel, setExportingExcel] = useState(false);

  function saveSettings() {
    setUserSetting("signature", userId, signature);
    setUserSetting("archive_email", userId, archiveEmail);
    alert("נשמר");
  }

  async function handleExcelBackup() {
    setExportingExcel(true);
    try {
      await exportBackupExcel(userId);
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section title="פרופיל">
        <div style={grid}>
          <Input label="שם מלא" value={profile.full_name} onChange={(value) => setProfile((current) => ({ ...current, full_name: value }))} />
          <Input label="טלפון" value={profile.phone} onChange={(value) => setProfile((current) => ({ ...current, phone: value }))} />
          <Input label="שם סוכנות" value={profile.agency_name} onChange={(value) => setProfile((current) => ({ ...current, agency_name: value }))} />
        </div>
      </Section>

      <Section title="חתימת מייל">
        <textarea value={signature} onChange={(event) => setSignature(event.target.value)} rows={6} style={inputStyle} />
      </Section>

      <Section title="מייל לתיוק">
        <input type="email" value={archiveEmail} onChange={(event) => setArchiveEmail(event.target.value)} style={inputStyle} />
      </Section>

      <Section title="ייבוא / ייצוא">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ImportExcel />
          <button type="button" onClick={downloadTemplate} style={button}>הורד תבנית Excel</button>
          <button type="button" onClick={handleExcelBackup} disabled={exportingExcel} style={button}>
            {exportingExcel ? "מייצא..." : "יצא אקסל גיבוי"}
          </button>
          <button type="button" onClick={() => exportBackupJson({})} style={button}>ייצוא גיבוי JSON</button>
        </div>
      </Section>

      <button type="button" onClick={saveSettings} style={buttonPrimary}>שמור</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: "var(--bg-card)",
      border: "1px solid #DDE7F3",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card)",
      padding: 20,
    }}>
      <h2 style={{ margin: "0 0 14px", color: "var(--text-heading)", fontSize: 17 }}>{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 6, fontWeight: 800, color: "var(--text-heading)", fontSize: 13 }}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </label>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
  color: "var(--text-body)",
  fontFamily: "var(--font-main)",
};

const button: React.CSSProperties = {
  border: "1px solid #D8E4F2",
  background: "#fff",
  borderRadius: 10,
  padding: "11px 15px",
  fontFamily: "var(--font-main)",
  fontWeight: 800,
  cursor: "pointer",
};

const buttonPrimary: React.CSSProperties = {
  ...button,
  justifySelf: "start",
  background: "var(--accent)",
  color: "#fff",
  border: 0,
};
