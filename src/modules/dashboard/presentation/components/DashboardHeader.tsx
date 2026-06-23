"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Plus, Zap } from "lucide-react";
import type { FocusModeSession } from "@/modules/tasks/domain/entities/FocusModeSession";
import { getElapsedSec } from "@/modules/tasks/domain/entities/FocusModeSession";

interface Props {
  habitsProgress: { completed: number; total: number };
  focusSession: FocusModeSession | null;
  onOpenFocusOverlay: () => void;
  onNewTask: () => void;
}

function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getGreeting(t: ReturnType<typeof useTranslations<"dashboard">>): string {
  const h = new Date().getHours();
  if (h < 12) return t("greeting_morning");
  if (h < 18) return t("greeting_afternoon");
  return t("greeting_evening");
}

export function DashboardHeader({ habitsProgress, focusSession, onOpenFocusOverlay, onNewTask }: Props) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;

  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!focusSession) return;
    const id = setInterval(() => forceTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [focusSession]);

  const dateStr = format(new Date(), "EEEE d 'de' MMMM", { locale: dateFnsLocale });
  const greeting = getGreeting(t);

  const focusElapsed = focusSession ? getElapsedSec(focusSession) : 0;
  const focusGoalSec = focusSession ? focusSession.durationMin * 60 : 0;
  const focusRemaining = Math.max(0, focusGoalSec - focusElapsed);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between w-full">
      {/* Left: date + greeting */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-lg lg:text-xl font-bold capitalize" style={{ color: "var(--text-primary)" }}>
          {dateStr}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {greeting}
        </p>
      </div>

      {/* Right: pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Habits progress */}
        {habitsProgress.total > 0 && (
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: habitsProgress.completed === habitsProgress.total ? "rgba(76,175,130,0.15)" : "var(--surface-elevated)",
              color: habitsProgress.completed === habitsProgress.total ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            {t("habits_progress", { completed: habitsProgress.completed, total: habitsProgress.total })}
          </span>
        )}

        {/* Focus pill */}
        {focusSession && (
          <button
            type="button"
            onClick={onOpenFocusOverlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity active:opacity-70"
            style={{ background: "rgba(76,175,130,0.15)", color: "var(--accent)" }}
          >
            <Zap size={12} fill="currentColor" />
            {formatClock(focusRemaining)}
          </button>
        )}

        {/* New task button */}
        <button
          type="button"
          onClick={onNewTask}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-opacity active:opacity-70"
          style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span className="hidden lg:inline">{t("new_task")}</span>
        </button>
      </div>
    </div>
  );
}
