import { createBrowserClient, createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "placeholder" &&
      supabaseAnonKey !== "placeholder",
  );
}

export const createClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

export const createServerClient = async () => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; middleware/routes can refresh them.
        }
      },
    },
  });
};

export const createServiceClient = () => {
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase service configuration");
  }

  return createSupabaseServiceClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
