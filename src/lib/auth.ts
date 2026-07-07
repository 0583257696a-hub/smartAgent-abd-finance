type LocalProfile = {
  id: string;
  email: string;
  full_name: string;
  agency_name: string;
  phone: string;
  role: "agent" | "admin" | "super_admin" | "viewer";
  status: "approved" | "pending" | "blocked";
};

const sessionKey = "ops_cloudflare_session";
const usersKey = "ops_cloudflare_users";

const defaultAdmin: LocalProfile & { password: string } = {
  id: "local-admin",
  email: "admin@insurance-ops.co.il",
  password: "Admin123456!",
  full_name: "מנהל המערכת",
  agency_name: "מרכז תפעול",
  phone: "050-0000000",
  role: "super_admin",
  status: "approved",
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readUsers() {
  if (!canUseLocalStorage()) return [defaultAdmin];

  const raw = window.localStorage.getItem(usersKey);
  if (!raw) {
    window.localStorage.setItem(usersKey, JSON.stringify([defaultAdmin]));
    return [defaultAdmin];
  }

  try {
    const parsed = JSON.parse(raw) as Array<LocalProfile & { password: string }>;
    if (!parsed.some((user) => user.email === defaultAdmin.email)) parsed.unshift(defaultAdmin);
    return parsed;
  } catch {
    window.localStorage.setItem(usersKey, JSON.stringify([defaultAdmin]));
    return [defaultAdmin];
  }
}

function writeUsers(users: Array<LocalProfile & { password: string }>) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(usersKey, JSON.stringify(users));
}

export async function signIn(email: string, password: string) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    if (!response.ok) throw new Error("Invalid credentials");
    const data = await response.json() as { user: LocalProfile };
    if (canUseLocalStorage()) window.localStorage.setItem(sessionKey, JSON.stringify(data.user));
    return data;
  } catch (error) {
    console.warn("D1 login unavailable, using local fallback", error);
  }

  const users = readUsers();
  const user = users.find(
    (candidate) =>
      candidate.email.toLowerCase() === email.toLowerCase() &&
      candidate.password === password,
  );

  if (!user) throw new Error("Invalid credentials");
  if (user.status === "blocked") throw new Error("User blocked");

  if (canUseLocalStorage()) {
    const profile: LocalProfile = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      agency_name: user.agency_name,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };
    window.localStorage.setItem(sessionKey, JSON.stringify(profile));
  }

  return { user };
}

export async function signUp(payload: {
  email: string;
  password: string;
  full_name: string;
  agency_name: string;
  phone: string;
  notes?: string;
}) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", ...payload }),
    });
    if (!response.ok) throw new Error("Registration failed");
    return await response.json();
  } catch (error) {
    console.warn("D1 registration unavailable, using local fallback", error);
  }

  const users = readUsers();
  if (users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
    throw new Error("User already exists");
  }

  const user = {
    id: recordId(),
    email: payload.email,
    password: payload.password,
    full_name: payload.full_name,
    agency_name: payload.agency_name,
    phone: payload.phone,
    role: "agent" as const,
    status: "pending" as const,
  };

  writeUsers([...users, user]);
  return { user };
}

export async function signOut() {
  if (canUseLocalStorage()) window.localStorage.removeItem(sessionKey);
}

export async function getProfile() {
  if (!canUseLocalStorage()) return getServerProfile();

  const raw = window.localStorage.getItem(sessionKey);
  if (raw) {
    try {
      return JSON.parse(raw) as LocalProfile;
    } catch {
      window.localStorage.removeItem(sessionKey);
    }
  }

  return null;
}

export async function getServerProfile() {
  return {
    id: "local-dev",
    email: "local@insurance-ops.dev",
    full_name: "משתמש מקומי",
    agency_name: "Cloudflare",
    phone: "",
    role: "super_admin",
    status: "approved",
  } satisfies LocalProfile;
}

function recordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
