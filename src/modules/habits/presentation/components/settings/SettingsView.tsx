"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, User, Sun, Moon } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";
import { useBrowserNotifications } from "@/shared/hooks/useBrowserNotifications";
import { createClient } from "@/shared/lib/supabase/client";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

export default function SettingsView({ userId: _userId }: Props) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="px-5 pt-14 pb-8 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>Ajustes</h1>
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "var(--surface-elevated)" }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "var(--surface-elevated)" }}
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <NotificationsSection />

      {/* Account quick actions */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
          Cuenta
        </p>
        <div className="rounded-[20px] overflow-hidden" style={{ background: "var(--surface)" }}>
          <button
            onClick={() => router.push("/profile")}
            className="w-full px-5 py-4 flex items-center justify-between transition-opacity active:opacity-60"
          >
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Mi perfil</span>
            <span style={{ color: "var(--text-secondary)", fontSize: 18 }}>→</span>
          </button>
          <div style={{ height: 1, background: "var(--border)" }} />
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    const client = createClient();
    await client.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="w-full px-5 py-4 flex items-center justify-between transition-opacity active:opacity-60 disabled:opacity-40"
    >
      <span className="text-sm font-medium" style={{ color: "var(--danger)" }}>
        {loading ? "Cerrando sesión…" : "Cerrar sesión"}
      </span>
    </button>
  );
}

function NotificationsSection() {
  const { permission, isEnabled, reminderTime, enable, disable, setReminderTime, subscribeError, isLoading } =
    useBrowserNotifications();

  const handleToggle = async () => {
    if (isEnabled) {
      disable();
    } else {
      await enable();
    }
  };

  if (permission === "unsupported") return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
        Notificaciones
      </p>
      <div className="rounded-[20px] overflow-hidden" style={{ background: "var(--surface)" }}>
        {/* Toggle row */}
        <div className="flex items-center gap-4 p-4">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: isEnabled ? "rgba(76,207,130,0.15)" : "var(--surface-elevated)" }}
          >
            {isEnabled
              ? <Bell size={18} color="#4CAF82" />
              : <BellOff size={18} color="var(--text-muted)" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
              Recordatorio diario
            </p>
            <p className="text-xs mt-0.5" style={{ color: subscribeError ? "var(--danger)" : "var(--text-secondary)" }}>
              {subscribeError
                ? subscribeError
                : permission === "denied"
                  ? "Permiso denegado — actívalo en ajustes del navegador"
                  : isEnabled
                    ? "Notificación activa ✓"
                    : "Recibe un aviso para no olvidar tus hábitos"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={permission === "denied" || isLoading}
            className="flex-shrink-0 w-12 h-7 rounded-full relative transition-colors disabled:opacity-30"
            style={{ background: isEnabled ? "#4CAF82" : "var(--border)" }}
          >
            {isLoading ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              </span>
            ) : (
              <span
                className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: isEnabled ? "calc(100% - 24px)" : "4px" }}
              />
            )}
          </button>
        </div>

        {/* Time picker */}
        {isEnabled && permission === "granted" && (
          <div
            className="flex items-center justify-between px-4 pb-4 pt-0"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Hora del recordatorio</p>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="rounded-[10px] px-3 py-1.5 text-sm font-medium outline-none"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                colorScheme: "dark",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
