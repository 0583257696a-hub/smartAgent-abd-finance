'use client'

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Lock, Pencil, Plus, RefreshCw, Shield, Trash2, UserCog, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

type PermissionAction = "view" | "create" | "edit" | "delete" | "import" | "export";
type PermissionMap = Record<string, Record<PermissionAction, boolean>>;

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  agency_name: string;
  phone: string;
  notes: string;
  role: "agent" | "admin" | "super_admin" | "viewer";
  status: "approved" | "pending" | "blocked";
  permissions: PermissionMap;
  created_at: string;
  updated_at: string;
};

type AdminModule = {
  key: string;
  label: string;
  source: "public" | "private";
};

type AuditRow = {
  id: string;
  action: string;
  actor_id: string | null;
  target_id: string | null;
  created_at: string;
};

type AdminState = {
  users: AdminUser[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    blocked: number;
    admins: number;
  };
  modules: AdminModule[];
  audit: AuditRow[];
};

const permissionLabels: Record<PermissionAction, string> = {
  view: "צפייה",
  create: "הוספה",
  edit: "עריכה",
  delete: "מחיקה",
  import: "ייבוא",
  export: "ייצוא",
};

const emptyState: AdminState = {
  users: [],
  stats: { total: 0, pending: 0, approved: 0, blocked: 0, admins: 0 },
  modules: [],
  audit: [],
};

export default function AdminPage() {
  const [state, setState] = useState<AdminState>(emptyState);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  const loadAdminState = useCallback(async (userId = readCurrentSession()?.id ?? currentUserId) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        cache: "no-store",
        headers: userId ? { "x-ops-user-id": userId } : {},
      });
      if (!response.ok) throw new Error("Failed to load admin state");
      setState(await response.json() as AdminState);
    } catch {
      setError("לא ניתן לטעון את פאנל הניהול. נדרשת כניסה עם משתמש מנהל.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const session = readCurrentSession();
    setCurrentUserId(session?.id ?? "");
    void loadAdminState(session?.id ?? "");
  }, [loadAdminState]);

  async function adminAction(payload: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(currentUserId ? { "x-ops-user-id": currentUserId } : {}),
      },
      body: JSON.stringify({ ...payload, actor_id: currentUserId }),
    });
    if (!response.ok) {
      setError("הפעולה נכשלה. נסה שוב.");
      return;
    }
    setState(await response.json() as AdminState);
  }

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.users.filter((user) => {
      const text = `${user.full_name} ${user.email} ${user.agency_name} ${user.phone}`.toLowerCase();
      return (!normalized || text.includes(normalized)) &&
        (!statusFilter || user.status === statusFilter) &&
        (!roleFilter || user.role === roleFilter);
    });
  }, [query, roleFilter, state.users, statusFilter]);

  function openCreateModal() {
    const basePermissions = Object.fromEntries(
      state.modules.map((module) => [
        module.key,
        { view: true, create: true, edit: true, delete: true, import: true, export: true },
      ]),
    ) as PermissionMap;

    setEditingUser({
      id: "",
      email: "",
      full_name: "",
      agency_name: "",
      phone: "",
      notes: "",
      role: "agent",
      status: "pending",
      permissions: basePermissions,
      created_at: "",
      updated_at: "",
    });
    setCreating(true);
  }

  function updateDraft(patch: Partial<AdminUser>) {
    setEditingUser((current) => current ? { ...current, ...patch } : current);
  }

  function togglePermission(moduleKey: string, action: PermissionAction) {
    setEditingUser((current) => {
      if (!current) return current;
      const currentModule = current.permissions[moduleKey] ?? { view: false, create: false, edit: false, delete: false, import: false, export: false };
      return {
        ...current,
        permissions: {
          ...current.permissions,
          [moduleKey]: {
            ...currentModule,
            [action]: !currentModule[action],
          },
        },
      };
    });
  }

  async function saveUser() {
    if (!editingUser) return;
    await adminAction({
      action: creating ? "create" : "update",
      ...editingUser,
      password: creating ? "Temp123456!" : undefined,
    });
    setEditingUser(null);
    setCreating(false);
  }

  async function savePassword() {
    if (!passwordUser || !newPassword) return;
    await adminAction({ action: "reset_password", id: passwordUser.id, password: newPassword });
    setPasswordUser(null);
    setNewPassword("");
  }

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <header style={panel}>
        <div>
          <h1 style={titleStyle}>פאנל ניהול</h1>
          <p style={subtitleStyle}>ניהול משתמשים, תפקידים והרשאות גישה למערכת</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" style={neutralButton} onClick={() => loadAdminState()}>
            <RefreshCw size={16} />
            רענון
          </button>
          <button type="button" style={primaryButton} onClick={openCreateModal}>
            <Plus size={16} />
            משתמש חדש
          </button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <Stat icon={<UserCog size={19} />} label="סה״כ משתמשים" value={state.stats.total} />
        <Stat icon={<Shield size={19} />} label="מנהלים" value={state.stats.admins} />
        <Stat icon={<Check size={19} />} label="מאושרים" value={state.stats.approved} />
        <Stat icon={<Lock size={19} />} label="חסומים" value={state.stats.blocked} />
        <Stat icon={<RefreshCw size={19} />} label="ממתינים" value={state.stats.pending} />
      </div>

      <div style={panel}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) 180px 180px", gap: 10 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי שם / אימייל / סוכנות / טלפון..."
            style={inputStyle}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}>
            <option value="">כל הסטטוסים</option>
            <option value="pending">ממתין</option>
            <option value="approved">מאושר</option>
            <option value="blocked">חסום</option>
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} style={inputStyle}>
            <option value="">כל התפקידים</option>
            <option value="viewer">צופה</option>
            <option value="agent">סוכן</option>
            <option value="admin">מנהל</option>
            <option value="super_admin">מנהל על</option>
          </select>
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}
      {loading ? <div style={panel}>טוען נתונים...</div> : (
        <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1060, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["משתמש", "אימייל", "סוכנות", "טלפון", "תפקיד", "סטטוס", "הרשאות", "נוצר", "פעולות"].map((header) => (
                    <th key={header} style={th}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={user.id} style={{ background: index % 2 ? "#F8FAFC" : "#fff" }}>
                    <td style={td}><strong>{user.full_name}</strong></td>
                    <td style={td}>{user.email}</td>
                    <td style={td}>{user.agency_name}</td>
                    <td style={td}>{user.phone}</td>
                    <td style={td}>{roleLabel(user.role)}</td>
                    <td style={td}><StatusBadge status={user.status} /></td>
                    <td style={td}>{permissionSummary(user.permissions)}</td>
                    <td style={td}>{dateLabel(user.created_at)}</td>
                    <td style={td}>
                      <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" style={iconButton} title="עריכה והרשאות" onClick={() => { setEditingUser(user); setCreating(false); }}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" style={iconButton} title="אשר משתמש" onClick={() => adminAction({ action: "update", ...user, status: "approved" })}>
                          <Check size={15} />
                        </button>
                        <button type="button" style={iconButton} title="חסום משתמש" onClick={() => adminAction({ action: "update", ...user, status: "blocked" })}>
                          <X size={15} />
                        </button>
                        <button type="button" style={iconButton} title="שינוי סיסמה" onClick={() => setPasswordUser(user)}>
                          <KeyRound size={15} />
                        </button>
                        <button type="button" style={dangerButton} title="מחיקה" disabled={user.role === "super_admin"} onClick={() => adminAction({ action: "delete", id: user.id })}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section style={panel}>
        <h2 style={sectionTitle}>יומן פעולות אחרונות</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {state.audit.slice(0, 12).map((row) => (
            <div key={row.id} style={auditRow}>
              <strong>{auditActionLabel(row.action)}</strong>
              <span>{dateLabel(row.created_at)}</span>
            </div>
          ))}
          {!state.audit.length && <span style={{ color: "var(--text-muted)" }}>אין פעולות להצגה</span>}
        </div>
      </section>

      <Modal
        open={Boolean(editingUser)}
        title={creating ? "הוספת משתמש" : "עריכת משתמש והרשאות"}
        subtitle="הגדר תפקיד, סטטוס והרשאות לפי מודול"
        onClose={() => { setEditingUser(null); setCreating(false); }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
            <button type="button" style={primaryButton} onClick={saveUser}>שמירה</button>
            <button type="button" style={neutralButton} onClick={() => { setEditingUser(null); setCreating(false); }}>ביטול</button>
          </div>
        }
      >
        {editingUser && (
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              <Field label="שם מלא" value={editingUser.full_name} onChange={(value) => updateDraft({ full_name: value })} />
              <Field label="אימייל" value={editingUser.email} onChange={(value) => updateDraft({ email: value })} />
              <Field label="סוכנות" value={editingUser.agency_name} onChange={(value) => updateDraft({ agency_name: value })} />
              <Field label="טלפון" value={editingUser.phone} onChange={(value) => updateDraft({ phone: value })} />
              <label style={fieldLabel}>
                תפקיד
                <select value={editingUser.role} onChange={(event) => updateDraft({ role: event.target.value as AdminUser["role"] })} style={inputStyle}>
                  <option value="viewer">צופה</option>
                  <option value="agent">סוכן</option>
                  <option value="admin">מנהל</option>
                  <option value="super_admin">מנהל על</option>
                </select>
              </label>
              <label style={fieldLabel}>
                סטטוס
                <select value={editingUser.status} onChange={(event) => updateDraft({ status: event.target.value as AdminUser["status"] })} style={inputStyle}>
                  <option value="pending">ממתין</option>
                  <option value="approved">מאושר</option>
                  <option value="blocked">חסום</option>
                </select>
              </label>
            </div>

            <div>
              <h3 style={sectionTitle}>הרשאות לפי מודול</h3>
              <div style={{ overflowX: "auto", border: "1px solid var(--border-soft)", borderRadius: 14 }}>
                <table style={{ width: "100%", minWidth: 760, borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th style={th}>מודול</th>
                      {Object.entries(permissionLabels).map(([key, label]) => <th key={key} style={th}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {state.modules.map((module, index) => (
                      <tr key={module.key} style={{ background: index % 2 ? "#F8FAFC" : "#fff" }}>
                        <td style={td}>
                          <strong>{cleanLabel(module.label)}</strong>
                          <span style={{ display: "block", color: "var(--text-muted)", fontSize: 12 }}>{module.source === "public" ? "ציבורי" : "פרטי"}</span>
                        </td>
                        {Object.keys(permissionLabels).map((action) => (
                          <td key={action} style={td}>
                            <input
                              type="checkbox"
                              checked={Boolean(editingUser.permissions[module.key]?.[action as PermissionAction])}
                              onChange={() => togglePermission(module.key, action as PermissionAction)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(passwordUser)}
        title="שינוי סיסמה"
        subtitle={passwordUser?.email}
        onClose={() => { setPasswordUser(null); setNewPassword(""); }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
            <button type="button" style={primaryButton} onClick={savePassword}>עדכן סיסמה</button>
            <button type="button" style={neutralButton} onClick={() => { setPasswordUser(null); setNewPassword(""); }}>ביטול</button>
          </div>
        }
      >
        <Field label="סיסמה חדשה" value={newPassword} onChange={setNewPassword} type="password" />
      </Modal>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={statCard}>
      <span style={statIcon}>{icon}</span>
      <div>
        <strong style={{ color: "var(--text-heading)", fontSize: 26 }}>{value}</strong>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13, fontWeight: 800 }}>{label}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label style={fieldLabel}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} style={inputStyle} />
    </label>
  );
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  if (status === "approved") return <Badge tone="success">מאושר</Badge>;
  if (status === "blocked") return <Badge tone="danger">חסום</Badge>;
  return <Badge tone="warning">ממתין</Badge>;
}

function roleLabel(role: AdminUser["role"]) {
  if (role === "super_admin") return "מנהל על";
  if (role === "admin") return "מנהל";
  if (role === "viewer") return "צופה";
  return "סוכן";
}

function permissionSummary(permissions: PermissionMap) {
  const values = Object.values(permissions).flatMap((permission) => Object.values(permission));
  const enabled = values.filter(Boolean).length;
  return `${enabled}/${values.length} פעיל`;
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    login: "כניסה למערכת",
    register: "בקשת הרשמה",
    admin_create_user: "יצירת משתמש",
    admin_update_user: "עדכון משתמש",
    admin_reset_password: "שינוי סיסמה",
    admin_delete_user: "מחיקת משתמש",
  };
  return labels[action] ?? action;
}

function dateLabel(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("he-IL");
}

function cleanLabel(value: string) {
  return value.replace(/[׳×₪¢•™”‘ §—©¨]+/g, "").trim() || value;
}

function readCurrentSession() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem("ops_cloudflare_session") ?? "null") as { id?: string; role?: string } | null;
  } catch {
    return null;
  }
}

const panel: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-soft)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
  padding: 18,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-heading)",
  fontSize: 28,
  fontWeight: 900,
};

const subtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--text-muted)",
  fontSize: 14,
  fontWeight: 700,
};

const statCard: React.CSSProperties = {
  ...panel,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const statIcon: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 13,
  display: "grid",
  placeItems: "center",
  color: "var(--accent)",
  background: "var(--accent-light)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  color: "var(--text-body)",
  outline: "none",
};

const fieldLabel: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "var(--text-heading)",
  fontSize: 13,
  fontWeight: 900,
};

const th: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: "#F8FAFC",
  color: "var(--text-heading)",
  borderBottom: "1px solid var(--border-soft)",
  padding: "12px 14px",
  textAlign: "right",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid var(--border-soft)",
  padding: "12px 14px",
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 700,
  verticalAlign: "middle",
};

const primaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  padding: "10px 16px",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const neutralButton: React.CSSProperties = {
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  padding: "10px 16px",
  background: "#fff",
  color: "var(--primary)",
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const iconButton: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  background: "#fff",
  color: "var(--primary)",
  display: "inline-grid",
  placeItems: "center",
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  ...iconButton,
  color: "var(--status-blocked)",
  background: "var(--status-blocked-bg)",
};

const errorBox: React.CSSProperties = {
  border: "1px solid #FECACA",
  background: "var(--status-blocked-bg)",
  color: "var(--status-blocked)",
  borderRadius: 12,
  padding: "12px 14px",
  fontWeight: 800,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "var(--text-heading)",
  fontSize: 18,
  fontWeight: 900,
};

const auditRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  padding: "10px 12px",
  color: "var(--text-body)",
  fontSize: 13,
};
