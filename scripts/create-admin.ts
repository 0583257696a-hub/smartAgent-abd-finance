import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./load-env";

loadEnvFile();

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { error } = await supabase.auth.admin.createUser({
    email: "admin@insurance-ops.co.il",
    password: "Admin123456!",
    email_confirm: true,
    user_metadata: {
      full_name: "מנהל המערכת",
      agency_name: "מרכז תפעול",
      phone: "050-0000000",
      status: "approved",
      role: "super_admin",
    },
  });

  if (error) throw error;
  console.log("Admin created");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
