"use client";

import { useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "#000000" }}>

      <div className="w-full max-w-sm flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl"
            style={{ background: "#111111", border: "1px solid #2A2A2A" }}>
            🔥
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#FFFFFF" }}>
              Habits
            </h1>
            <p className="text-sm mt-1" style={{ color: "#8888AA" }}>
              Construye rachas. Construye disciplina.
            </p>
          </div>
        </div>

        <div className="w-full rounded-[20px] p-6 flex flex-col gap-4"
          style={{ background: "#111111" }}>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 rounded-[14px] flex items-center justify-center gap-3 font-medium text-sm transition-opacity active:opacity-70 disabled:opacity-50"
            style={{ background: "#FFFFFF", color: "#000000" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {isLoading ? "Conectando..." : "Continuar con Google"}
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: "#8888AA" }}>
          Tus datos se guardan de forma privada y segura.
        </p>
      </div>
    </main>
  );
}
