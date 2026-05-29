import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/shared/types/database.types";

const stripBOM = (s: string) => s.replace(/^﻿/, "");

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components no pueden setear cookies — el middleware lo maneja.
          }
        },
      },
    }
  );
}
