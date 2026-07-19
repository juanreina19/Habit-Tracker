"use client";

import { useState } from "react";
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
          className="w-full rounded-xl overflow-hidden mb-8 text-left transition-opacity active:opacity-70"
          style={{ background: "var(--surface)" }}
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
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("language")}</span>
            <div className="relative">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="rounded-md pl-3 pr-8 py-1.5 text-sm outline-none appearance-none"
                style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              <ChevronDown size={14} strokeWidth={2} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("time_format")}</span>
            <div className="relative">
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                className="rounded-md pl-3 pr-8 py-1.5 text-sm outline-none appearance-none"
                style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
              >
                <option value="12h">{t("time_format_12h")}</option>
                <option value="24h">{t("time_format_24h")}</option>
              </select>
              <ChevronDown size={14} strokeWidth={2} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
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
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)" }}>
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
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)" }}>
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
                colorScheme: "dark",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
