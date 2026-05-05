"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let supabaseBrowserClient: SupabaseClient<Database> | null = null;

export function createClient() {
  if (supabaseBrowserClient) return supabaseBrowserClient;

  const env = getPublicEnv();

  supabaseBrowserClient = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return supabaseBrowserClient;
}
