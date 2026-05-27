'use client'

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import SearchBar from "@/components/ui/SearchBar";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  agency_name: string;
  phone: string;
  role: "agent" | "admin" | "viewer";
  status: "approved" | "pending" | "blocked";
  created_at: string;
};

const initialUsers: UserRow[] = [
  {
    id: "local-admin",
    full_name: "מנהל המערכת",
    email: "admin@insurance-ops.co.il",
    agency_name: "מרכז תפעול",
    phone: "050-0000000",
    role: "admin",
    status: "approved",
    created_at: new Date().toISOString(),
  },
];

export default function AdminPage() {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => users.filter((user) => JSON.stringify(user).toLowerCase().includes(query.toLowerCase())),
    [query, users],
  );

  const counts = {
    total: users.length,
    pending: users.filter((user) => user.status === "pending").length,
    approved: users.filter((user) => user.status === "approved").length,
    blocked: users.filter((user) => user.status === "blocked").length,
  };

  function updateUser(id: string, patch: Partial<UserRow>) {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, color: "var(--text-heading)", fontSize: 24 }}>פאנל ניהול</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>ניהול הרשאות משתמשים</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Stat label='סה"כ משתמשים' value={counts.total} />
        <Stat label="ממתינים" value={counts.pending} />
        <Stat label="מאושרים" value={counts.approved} />
        <Stat label="חסומים" value={counts.blocked} />
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="חיפוש לפי שם / אימייל / סוכנות..." />
      <div style={{ overflow: "auto", background: "#fff", borderRadius: 14, border: "1px solid #DDE7F3" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 920 }}>
          <thead>
            <tr>
              {["שם מלא", "אימייל", "סוכנות", "טלפון", "תפקיד", "סטטוס", "תאריך הצטרפות", "פעולות"].map((label) => (
                <th key={label} style={th}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, index) => (
              <tr key={user.id} style={{ background: index % 2 ? "#F8FAFC" : "#fff" }}>
                <td style={td}>{user.full_name}</td>
                <td style={td}>{user.email}</td>
                <td style={td}>{user.agency_name}</td>
                <td style={td}>{user.phone}</td>
                <td style={td}>
                  <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value as UserRow["role"] })}>
                    <option value="agent">agent</option>
                    <option value="admin">admin</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>
                <td style={td}><StatusBadge status={user.status} /></td>
                <td style={td}>{new Date(user.created_at).toLocaleDateString("he-IL")}</td>
                <td style={td}>
                  <button style={miniButton} onClick={() => updateUser(user.id, { status: "approved" })}>אשר</button>
                  <button style={miniButton} onClick={() => updateUser(user.id, { status: "blocked" })}>חסום</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 14, padding: 16 }}>
      <strong style={{ color: "var(--text-heading)", fontSize: 24 }}>{value}</strong>
      <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: UserRow["status"] }) {
  if (status === "approved") return <Badge tone="success">מאושר</Badge>;
  if (status === "blocked") return <Badge tone="danger">חסום</Badge>;
  return <Badge tone="warning">ממתין</Badge>;
}

const th: React.CSSProperties = {
  position: "sticky",
  top: 0,
  background: "#F1F6FC",
  padding: "13px 14px",
  textAlign: "right",
  fontSize: 12,
  color: "var(--text-heading)",
};

const td: React.CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #EAF0F7",
  fontSize: 13,
};

const miniButton: React.CSSProperties = {
  marginInlineEnd: 6,
  border: "1px solid #D8E4F2",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 9px",
  cursor: "pointer",
};
