import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/database.types";

let supabaseAdminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (supabaseAdminClient) return supabaseAdminClient;

  const env = getServerEnv();

  supabaseAdminClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return supabaseAdminClient;
}
