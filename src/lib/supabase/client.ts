"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let supabaseBrowserClient: SupabaseClient<Database> | null = null;

export function createClient() {
  if (supabaseBrowserClient) return supabaseBrowserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in development.",
      );
    }
    console.error("Missing Supabase environment variables in browser client.");
    supabaseBrowserClient = createBrowserClient<Database>(
      "https://missing-project.supabase.co",
      "missing-anon-key"
    );
    return supabaseBrowserClient;
  }

  supabaseBrowserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return supabaseBrowserClient;
}
