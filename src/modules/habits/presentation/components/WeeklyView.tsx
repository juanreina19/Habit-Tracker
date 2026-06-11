"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWeekly } from "../hooks/useWeekly";
import { useLocale } from "@/shared/i18n/useLocale";
import type { UUID } from "@/shared/types/database.types";
import type { DayStatus, WeeklyHabitProgress } from "../../domain/use-cases/GetWeeklyProgressUseCase";
import { format, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";

interface Props {
  userId: UUID;
  userCreatedAt?: string;
  embedded?: boolean;
}

export default function WeeklyView({ userId, userCreatedAt, embedded = false }: Props) {
  const { data, isLoading, error, weekStart, goToPrevWeek, goToNextWeek,
    canGoPrev, canGoNext, isCurrentWeek } = useWeekly(userId, userCreatedAt);

  const t = useTranslations("calendar");
  const tDays = useTranslations("dayLabels");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;

  const DAY_LABELS = [tDays("d1"), tDays("d2"), tDays("d3"), tDays("d4"), tDays("d5"), tDays("d6"), tDays("d7")];

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartLabel = format(weekStart, "d MMM", { locale: dateFnsLocale });
  const weekEndLabel = format(weekEnd, "d MMM", { locale: dateFnsLocale });

  const inner = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {weekStartLabel} — {weekEndLabel}
          </p>
          {!embedded && (
            <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
              {isCurrentWeek ? t("this_week") : t("week")}
            </h1>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPrevWeek}
            disabled={!canGoPrev}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ background: "var(--surface-elevated)" }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNextWeek}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ background: "var(--surface-elevated)" }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Global summary banner */}
      {!isLoading && data && (
        <div
          className="rounded-[20px] p-5 mb-6 flex items-center gap-5"
          style={{ background: "var(--surface)" }}
        >
          <GlobalRing percentage={data.globalRate} />
          <div>
            <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {data.totalCompleted}/{data.totalScheduled}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {t("days_completed")}
            </p>
            <p className="text-xs mt-1.5" style={{ color: data.globalRate >= 80 ? "var(--accent)" : "var(--text-secondary)" }}>
              {data.globalRate >= 100 ? t("perfect_week") :
               data.globalRate >= 80 ? t("very_good") :
               data.globalRate >= 50 ? t("going_well") : t("keep_going")}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <WeeklySkeleton />
      ) : error ? (
        <div className="p-6 flex items-center justify-center">
          <p className="text-sm" style={{ color: "#FF5252" }}>Error: {error}</p>
        </div>
      ) : !data ? null : (
        <>
          {/* Day labels header */}
          {data.habits.length > 0 && (
            <div className="flex items-center gap-3 px-4 mb-1">
              <div className="w-9 flex-shrink-0" />
              <div className="flex-1" />
              <div className="flex gap-1 flex-shrink-0">
                {DAY_LABELS.map((label, i) => (
                  <div key={i} className="w-6 text-center text-[10px] font-semibold"
                    style={{ color: "#8888AA" }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Habit rows */}
          {data.habits.length === 0 ? (
            <div className="rounded-[20px] p-10 text-center" style={{ background: "var(--surface)" }}>
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>{t("no_habits_title")}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {t("no_habits_hint")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.habits.map((hp, index) => (
                <motion.div
                  key={hp.habit.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                >
                  <HabitWeekRow progress={hp} />
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  if (embedded) return inner;
  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      {inner}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HabitWeekRow({ progress }: { progress: WeeklyHabitProgress }) {
  const { habit, streak, days, completionRate } = progress;
  const accentColor = habit.color ?? "#4CAF82";

  return (
    <div
      className="rounded-[16px] px-4 py-3 flex items-center gap-3"
      style={{ background: "var(--surface)" }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: accentColor + "20", color: accentColor }}
      >
        <HabitIcon icon={habit.icon ?? "🎯"} size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {habit.name}
          </p>
          <span
            className="text-xs font-semibold flex-shrink-0"
            style={{ color: completionRate === 100 ? accentColor : "var(--text-secondary)" }}
          >
            {completionRate}%
          </span>
        </div>
        {streak && streak.currentStreak > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[11px] leading-none">🔥</span>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {streak.currentStreak}d
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-1 flex-shrink-0">
        {days.map((day, i) => (
          <DayDot key={i} day={day} accentColor={accentColor} />
        ))}
      </div>
    </div>
  );
}

function DayDot({ day, accentColor }: { day: DayStatus; accentColor: string }) {
  if (!day.isScheduled) {
    return <div className="w-6 h-6 flex items-center justify-center">
      <div className="w-1 h-1 rounded-full" style={{ background: "var(--border)" }} />
    </div>;
  }

  if (day.isFuture) {
    return <div className="w-6 h-6 rounded-full border" style={{ borderColor: "var(--border)", opacity: 0.4 }} />;
  }

  if (day.isCompleted) {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: accentColor }}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return <div className="w-6 h-6 rounded-full border" style={{ borderColor: "var(--border)" }} />;
}

function GlobalRing({ percentage }: { percentage: number }) {
  const size = 72;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={percentage >= 100 ? "var(--accent)" : "var(--text-primary)"} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90"
        style={{ fill: "var(--text-primary)", fontSize: size * 0.22, fontWeight: 600, transformOrigin: `${size / 2}px ${size / 2}px` }}>
        {percentage}%
      </text>
    </svg>
  );
}

function WeeklySkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-[20px] h-24 mb-6" style={{ background: "var(--surface)" }} />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-[16px] h-14 mb-2" style={{ background: "var(--surface)" }} />
      ))}
    </div>
  );
}
