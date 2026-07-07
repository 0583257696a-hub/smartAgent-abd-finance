import { ensureAdminSchema, getOpsDb, writeAuditLog } from "@/lib/d1";
import { modules } from "@/lib/modules";

type AdminAction =
  | "list"
  | "create"
  | "update"
  | "delete"
  | "reset_password";

type DbUser = {
  id: string;
  email: string;
  password: string;
  full_name: string;
  agency_name: string;
  phone: string;
  notes: string | null;
  role: "agent" | "admin" | "super_admin" | "viewer";
  status: "approved" | "pending" | "blocked";
  permissions: string;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  return listAdminState(request);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = String(body?.action ?? "") as AdminAction;
  if (!action) return Response.json({ error: "Missing action" }, { status: 400 });

  const db = await getOpsDb();
  if (!db) return Response.json({ error: "D1 database is unavailable" }, { status: 503 });
  await ensureAdminSchema(db);
  const actor = await requireAdmin(db, request);
  if (!actor) return Response.json({ error: "Admin access required" }, { status: 403 });

  if (action === "create") {
    const id = recordId();
    const user = normalizeUserInput(body ?? {});
    await db
      .prepare(
        `insert into ops_users (
          id, email, password, full_name, agency_name, phone, notes, role, status, permissions
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, user.email, user.password, user.full_name, user.agency_name, user.phone, user.notes, user.role, user.status, JSON.stringify(user.permissions))
      .run();
    await writeAuditLog(db, actor.id, "admin_create_user", id, { email: user.email });
    return listAdminState(request);
  }

  if (action === "update") {
    const id = String(body?.id ?? "");
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    const user = normalizeUserInput(body ?? {}, false);
    await db
      .prepare(
        `update ops_users set
          email = ?, full_name = ?, agency_name = ?, phone = ?, notes = ?,
          role = ?, status = ?, permissions = ?, updated_at = current_timestamp
        where id = ?`,
      )
      .bind(user.email, user.full_name, user.agency_name, user.phone, user.notes, user.role, user.status, JSON.stringify(user.permissions), id)
      .run();
    await writeAuditLog(db, actor.id, "admin_update_user", id, { email: user.email, role: user.role, status: user.status });
    return listAdminState(request);
  }

  if (action === "reset_password") {
    const id = String(body?.id ?? "");
    const password = String(body?.password ?? "");
    if (!id || !password) return Response.json({ error: "Missing id or password" }, { status: 400 });
    await db.prepare("update ops_users set password = ?, updated_at = current_timestamp where id = ?").bind(password, id).run();
    await writeAuditLog(db, actor.id, "admin_reset_password", id);
    return listAdminState(request);
  }

  if (action === "delete") {
    const id = String(body?.id ?? "");
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    await db.prepare("delete from ops_users where id = ? and role != 'super_admin'").bind(id).run();
    await writeAuditLog(db, actor.id, "admin_delete_user", id);
    return listAdminState(request);
  }

  return Response.json({ error: "Unsupported action" }, { status: 400 });
}

async function listAdminState(request: Request) {
  const db = await getOpsDb();
  if (!db) return Response.json({ error: "D1 database is unavailable" }, { status: 503 });
  await ensureAdminSchema(db);
  const actor = await requireAdmin(db, request);
  if (!actor) return Response.json({ error: "Admin access required" }, { status: 403 });

  const usersResult = await db
    .prepare("select * from ops_users order by created_at desc")
    .all<DbUser>();
  const auditResult = await db
    .prepare("select * from ops_audit_log order by created_at desc limit 80")
    .all<AuditRow>();

  const users = (usersResult.results ?? []).map(publicUser);
  const stats = {
    total: users.length,
    pending: users.filter((user) => user.status === "pending").length,
    approved: users.filter((user) => user.status === "approved").length,
    blocked: users.filter((user) => user.status === "blocked").length,
    admins: users.filter((user) => user.role === "admin" || user.role === "super_admin").length,
  };

  return Response.json({
    users,
    stats,
    audit: (auditResult.results ?? []).map((row) => ({
      ...row,
      details: parseJson(row.details),
    })),
    modules: modules.map((module) => ({ key: module.key, label: module.label, source: module.source })),
  });
}

function publicUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    agency_name: user.agency_name,
    phone: user.phone,
    notes: user.notes ?? "",
    role: user.role,
    status: user.status,
    permissions: parsePermissions(user.permissions),
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function requireAdmin(db: D1Database, request: Request) {
  const userId = request.headers.get("x-ops-user-id") ?? "";
  if (!userId) return null;

  const user = await db.prepare("select * from ops_users where id = ?").bind(userId).first<DbUser>();
  if (!user || user.status !== "approved") return null;
  if (user.role !== "admin" && user.role !== "super_admin") return null;
  return user;
}

function normalizeUserInput(input: Record<string, unknown>, requirePassword = true) {
  const role = normalizeChoice(input.role, ["agent", "admin", "super_admin", "viewer"], "agent");
  const status = normalizeChoice(input.status, ["approved", "pending", "blocked"], "pending");
  const permissions = typeof input.permissions === "object" && input.permissions
    ? input.permissions
    : role === "viewer"
      ? permissionTemplate(false, true)
      : permissionTemplate(true, true);

  const password = String(input.password ?? "");
  if (requirePassword && !password) throw new Error("Missing password");

  return {
    email: String(input.email ?? "").trim().toLowerCase(),
    password,
    full_name: String(input.full_name ?? "").trim(),
    agency_name: String(input.agency_name ?? "").trim(),
    phone: String(input.phone ?? "").trim(),
    notes: String(input.notes ?? "").trim() || null,
    role,
    status,
    permissions,
  };
}

function permissionTemplate(enabled: boolean, viewOnly = false) {
  return Object.fromEntries(
    modules.map((module) => [
      module.key,
      {
        view: enabled || viewOnly,
        create: enabled && !viewOnly,
        edit: enabled && !viewOnly,
        delete: enabled && !viewOnly,
        import: enabled && !viewOnly,
        export: enabled || viewOnly,
      },
    ]),
  );
}

function normalizeChoice<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  const text = String(value ?? "");
  return allowed.includes(text as T) ? text as T : fallback;
}

function parsePermissions(value: string) {
  return parseJson(value) ?? permissionTemplate(true, true);
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function recordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
