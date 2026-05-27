import { createClient, createServerClient, isSupabaseConfigured } from "./supabase";

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(payload: {
  email: string;
  password: string;
  full_name: string;
  agency_name: string;
  phone: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.full_name,
        agency_name: payload.agency_name,
        phone: payload.phone,
        notes: payload.notes,
        status: "pending",
        role: "agent",
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function getProfile() {
  if (!isSupabaseConfigured()) {
    return {
      id: "local-dev",
      email: "local@insurance-ops.dev",
      full_name: "משתמש מקומי",
      agency_name: "פיתוח מקומי",
      phone: "",
      role: "super_admin",
      status: "approved",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return profileFromUser(user);
  return data;
}

export async function getServerProfile() {
  if (!isSupabaseConfigured()) {
    return {
      id: "local-dev",
      email: "local@insurance-ops.dev",
      full_name: "משתמש מקומי",
      agency_name: "פיתוח מקומי",
      phone: "",
      role: "super_admin",
      status: "approved",
    };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return profileFromUser(user);
  return data;
}

function profileFromUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: String(metadata.full_name ?? ""),
    agency_name: String(metadata.agency_name ?? ""),
    phone: String(metadata.phone ?? ""),
    notes: String(metadata.notes ?? ""),
    status: String(metadata.status ?? "pending"),
    role: String(metadata.role ?? "agent"),
  };
}
