import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in development.",
      );
    }
    console.error("Missing Supabase environment variables in server client.");
    return createServerClient<Database>(
      "https://missing-project.supabase.co",
      "missing-anon-key",
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
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
            // Server Components may not be able to write cookies directly.
          }
        },
      },
    }
  );
}
