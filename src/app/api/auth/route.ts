import { ensureAdminSchema, getOpsDb, writeAuditLog } from "@/lib/d1";

type UserRole = "agent" | "admin" | "super_admin" | "viewer";
type UserStatus = "approved" | "pending" | "blocked";

type DbUser = {
  id: string;
  email: string;
  password: string;
  full_name: string;
  agency_name: string;
  phone: string;
  notes: string | null;
  role: UserRole;
  status: UserStatus;
  permissions: string;
  created_at: string;
  updated_at: string;
};

export async function POST(request: Request) {
  const db = await getOpsDb();
  const body = await request.json().catch(() => null) as { action?: string; [key: string]: unknown } | null;
  if (!body?.action) return Response.json({ error: "Missing action" }, { status: 400 });

  if (!db) return localAuthFallback(body);
  await ensureAdminSchema(db);

  if (body.action === "login") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const user = await db
      .prepare("select * from ops_users where lower(email) = ? and password = ?")
      .bind(email, password)
      .first<DbUser>();

    if (!user) return Response.json({ error: "Invalid credentials" }, { status: 401 });
    if (user.status === "blocked") return Response.json({ error: "User blocked" }, { status: 403 });
    await writeAuditLog(db, user.id, "login", user.id);
    return Response.json({ user: publicUser(user) });
  }

  if (body.action === "register") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const agencyName = String(body.agency_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const notes = String(body.notes ?? "").trim();

    if (!email || !password || !fullName || !agencyName || !phone) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const exists = await db.prepare("select id from ops_users where lower(email) = ?").bind(email).first<{ id: string }>();
    if (exists) return Response.json({ error: "User already exists" }, { status: 409 });

    const id = recordId();
    await db
      .prepare(
        `insert into ops_users (
          id, email, password, full_name, agency_name, phone, notes, role, status, permissions
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, email, password, fullName, agencyName, phone, notes || null, "agent", "pending", JSON.stringify(defaultAgentPermissions()))
      .run();
    await writeAuditLog(db, id, "register", id, { email, agencyName });
    return Response.json({ user: { id, email, full_name: fullName, agency_name: agencyName, phone, role: "agent", status: "pending", permissions: defaultAgentPermissions() } });
  }

  return Response.json({ error: "Unsupported action" }, { status: 400 });
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

function parsePermissions(value: string) {
  try {
    return JSON.parse(value) as Record<string, Record<string, boolean>>;
  } catch {
    return defaultAgentPermissions();
  }
}

function defaultAgentPermissions() {
  return {
    operational_emails: all(true),
    email_templates: all(true),
    management_fees: all(true),
    insurance_discounts: all(true),
    deposit_accounts: all(true),
    service_centers: all(true),
    institution_codes: all(true),
    bank_numbers: all(true),
    mortgage_release: all(true),
    passwords: all(true),
    supervisors: all(true),
    employers: all(true),
    clients: all(true),
    agent_numbers: all(true),
    links: all(true),
  };
}

function all(enabled: boolean) {
  return { view: enabled, create: enabled, edit: enabled, delete: enabled, import: enabled, export: enabled };
}

function recordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function localAuthFallback(body: { action?: string; [key: string]: unknown }) {
  if (body.action === "login" && String(body.email ?? "").toLowerCase() === "admin@insurance-ops.co.il" && body.password === "Admin123456!") {
    return Response.json({
      user: {
        id: "local-admin",
        email: "admin@insurance-ops.co.il",
        full_name: "מנהל המערכת",
        agency_name: "מרכז תפעול",
        phone: "050-0000000",
        role: "super_admin",
        status: "approved",
        permissions: defaultAgentPermissions(),
      },
    });
  }

  return Response.json({ error: "Database unavailable" }, { status: 503 });
}
