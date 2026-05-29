import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const stripBOM = (s: string) => s.replace(/^﻿/, "");

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  if (code) {
    const successResponse = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(
      stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL!),
      stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              successResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return successResponse;
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
