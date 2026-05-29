import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/shared/types/database.types";

const stripBOM = (s: string) => s.replace(/^﻿/, "");

export function createClient() {
  return createBrowserClient<Database>(
    stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );
}