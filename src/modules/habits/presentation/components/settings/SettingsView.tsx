"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, BellOff, User, Sun, Moon, BarChart2, ChevronDown } from "lucide-react";
import { useTheme } from "@/shared/components/ThemeProvider";
import { useTimeFormat, type TimeFormat } from "@/shared/components/TimeFormatProvider";
import { useLocale, type Locale } from "@/shared/i18n/useLocale";
import { useBrowserNotifications } from "@/shared/hooks/useBrowserNotifications";
import { createClient } from "@/shared/lib/supabase/client";
import { Loader } from "@/shared/components/ui/Loader";
import StatsView from "../StatsView";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

export default function SettingsView({ userId }: Props) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { format: timeFormat, setFormat: setTimeFormat } = useTimeFormat();
  const t = useTranslations("settings");
  const [showStats, setShowStats] = useState(false);

  if (showStats) {
    return (
      <div className="px-5 pt-14 pb-8 lg:pt-8 lg:px-10">
        <button
          onClick={() => setShowStats(false)}
          className="text-sm font-medium mb-4 flex items-center gap-1"
          style={{ color: "var(--accent)" }}
        >
          ← {t("title")}
        </button>
        <StatsView userId={userId} userCreatedAt={new Date().toISOString()} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-8 lg:pt-8 lg:px-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
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

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
          {t("statistics") || "Statistics"}
        </p>
        <button
          onClick={() => setShowStats(true)}
          className="w-full rounded-xl overflow-hidden mb-8 text-left transition-opacity active:opacity-70 glass-panel-strong"
        >
          <div className="px-5 py-4 flex items-center gap-4">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(76,207,130,0.15)" }}
            >
              <BarChart2 size={18} color="#4CAF82" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                {t("view_statistics") || "View Statistics"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {t("statistics_desc") || "Streaks, completion rates, achievements"}
              </p>
            </div>
            <span style={{ color: "var(--text-secondary)", fontSize: 18 }}>→</span>
          </div>
        </button>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0 * 0.05, ease: "easeOut" }}
      >
        <NotificationsSection />
      </motion.div>

      {/* Preferencias — idioma y formato de hora como filas simples (label + select) */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 1 * 0.05, ease: "easeOut" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
          {t("preferences")}
        </p>
        <div className="rounded-xl glass-panel">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("language")}</span>
            <SettingsSelect
              value={locale}
              onChange={(v) => setLocale(v as Locale)}
              options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]}
            />
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("time_format")}</span>
            <SettingsSelect
              value={timeFormat}
              onChange={(v) => setTimeFormat(v as TimeFormat)}
              options={[{ value: "12h", label: t("time_format_12h") }, { value: "24h", label: t("time_format_24h") }]}
            />
          </div>
        </div>
      </motion.div>

      {/* Account */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 2 * 0.05, ease: "easeOut" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
          {t("account")}
        </p>
        <div className="rounded-xl overflow-hidden glass-panel">
          <button
            onClick={() => router.push("/profile")}
            className="w-full px-5 py-4 flex items-center justify-between transition-opacity active:opacity-60"
          >
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("my_profile")}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: 18 }}>→</span>
          </button>
          <div style={{ height: 1, background: "var(--border)" }} />
          <SignOutButton />
        </div>
      </motion.div>
    </div>
  );
}

function SignOutButton() {
  const router = useRouter();
  const t = useTranslations("settings");
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
        {loading ? t("signing_out") : t("sign_out")}
      </span>
    </button>
  );
}

function NotificationsSection() {
  const { permission, isEnabled, reminderTime, enable, disable, setReminderTime, subscribeError, isLoading } =
    useBrowserNotifications();
  const t = useTranslations("settings");
  const { theme } = useTheme();

  const handleToggle = async () => {
    if (isEnabled) disable();
    else await enable();
  };

  if (permission === "unsupported") return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
        {t("notifications")}
      </p>
      <div className="rounded-xl overflow-hidden glass-panel-strong">
        <div className="flex items-center gap-4 p-4">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: isEnabled ? "rgba(76,207,130,0.15)" : "var(--surface-elevated)" }}
          >
            {isEnabled
              ? <Bell size={18} color="#4CAF82" />
              : <BellOff size={18} color="var(--text-muted)" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
              {t("daily_reminder")}
            </p>
            <p className="text-xs mt-0.5" style={{ color: subscribeError ? "var(--danger)" : "var(--text-secondary)" }}>
              {subscribeError
                ? subscribeError
                : permission === "denied"
                  ? t("reminder_denied")
                  : isEnabled
                    ? t("reminder_on")
                    : t("reminder_off")}
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
                <Loader size={14} color="#ffffff" />
              </span>
            ) : (
              <span
                className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: isEnabled ? "calc(100% - 24px)" : "4px" }}
              />
            )}
          </button>
        </div>

        {isEnabled && permission === "granted" && (
          <div
            className="flex items-center justify-between px-4 pb-4 pt-0"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("reminder_time")}</p>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="rounded-md px-3 py-1.5 text-sm font-medium outline-none"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                colorScheme: theme,
                accentColor: "var(--text-primary)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reemplaza el <select> nativo — su lista desplegada no se puede estilizar
 * de forma confiable entre navegadores/SO (aparece con el estilo default
 * del sistema). Mismo patrón de popover (rounded-2xl, var(--bg)) que ya usan
 * los pickers de categoría/prioridad en TaskFormDialog/WorkoutFormDialog.
 */
function SettingsSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="flex items-center gap-1.5 rounded-md pl-3 pr-2.5 py-1.5 text-sm glass-panel"
        style={{ color: "var(--text-primary)" }}
      >
        {current?.label}
        <ChevronDown size={14} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-10 rounded-2xl p-1 min-w-[140px] glass-panel-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors"
              style={{ color: opt.value === value ? "var(--text-primary)" : "var(--text-secondary)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
