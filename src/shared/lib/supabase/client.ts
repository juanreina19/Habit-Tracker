import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/shared/types/database.types";

/**
 * Cliente de Supabase para uso en componentes del lado del cliente (browser).
 * Usar en: componentes React, hooks, stores de Zustand.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
