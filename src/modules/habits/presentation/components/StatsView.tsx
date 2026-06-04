"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { useStats } from "../hooks/useStats";
import { useYearlyHeatmap } from "../hooks/useYearlyHeatmap";
import type { HabitStat, WeekTrend } from "../../domain/use-cases/GetStatsUseCase";
import type { DayProgress } from "../../domain/use-cases/GetMonthlyProgressUseCase";
import type { Achievement, UserAchievement } from "@/modules/achievements/domain/entities/Achievement";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  userCreatedAt?: string;
}

export default function StatsView({ userId, userCreatedAt }: Props) {
  const t = useTranslations("stats");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;

  const { data, isLoading, error } = useStats(userId, userCreatedAt);
  const currentYear = new Date().getFullYear();
  const { days: heatmapDays, isLoading: heatmapLoading } = useYearlyHeatmap(userId, currentYear);
  // Avoid Recharts SSR hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (isLoading) return <StatsSkeleton />;

  if (error) {
    return (
      <div className="p-6 pt-14 flex items-center justify-center min-h-screen">
        <p className="text-sm" style={{ color: "#FF5252" }}>Error: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { activeHabitsCount, bestCurrentStreak, bestEverStreak, monthlyRate,
    habitStats, weekTrends, userAchievements, allAchievements } = data;

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {format(new Date(), "MMMM yyyy", { locale: dateFnsLocale }).replace(/^\w/, (c) => c.toUpperCase())}
        </p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
          {t("title")}
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label={t("active")} value={activeHabitsCount.toString()} unit={t("habits_unit")} />
        <StatCard label={t("streak")} value={bestCurrentStreak.toString()} unit={t("days_unit")} highlight={bestCurrentStreak >= 7} />
        <StatCard label={t("this_month")} value={`${monthlyRate}%`} unit={t("completed_unit")} highlight={monthlyRate >= 80} />
      </div>

      {/* Yearly heatmap */}
      <Section title={t("activity_year", { year: currentYear })}>
        {heatmapLoading ? (
          <div className="h-20 rounded-[10px] animate-pulse" style={{ background: "#1A1A1A" }} />
        ) : (
          <YearlyHeatmap days={heatmapDays} year={currentYear} />
        )}
      </Section>

      {/* Weekly trend chart */}
      <Section title={t("weekly_trend")}>
        {isMounted && weekTrends.length > 0 ? (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekTrends} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fill: "#8888AA", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#8888AA", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#1C1C1C",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "#FFFFFF" }}
                  labelStyle={{ color: "#888888" }}
                  formatter={(value: number) => [`${value}%`, t("completed_label")]}
                />
                <Bar dataKey="completionRate" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {weekTrends.map((entry, i) => (
                    <Cell key={i} fill={getBarFill(entry.completionRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
      </Section>

      {/* Per-habit stats */}
      {habitStats.length > 0 && (
        <Section title={t("per_habit")}>
          <div className="flex flex-col gap-3">
            {habitStats.map((hs) => (
              <HabitStatRow key={hs.habit.id} stat={hs} />
            ))}
          </div>
        </Section>
      )}

      {/* Achievements */}
      <Section title={t("achievements")}>
        <div className="grid grid-cols-2 gap-3">
          {allAchievements.map((achievement) => {
            const userAchievement = userAchievements.find(
              (ua) => ua.achievementId === achievement.id
            );
            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                userAchievement={userAchievement}
              />
            );
          })}
        </div>
        {bestEverStreak > 0 && (
          <p className="text-center text-xs mt-4" style={{ color: "var(--text-secondary)" }}>
            {t("best_streak")} <span style={{ color: "var(--text-primary)" }}>{t("best_streak_unit", { n: bestEverStreak })}</span>
          </p>
        )}
      </Section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, highlight = false }: {
  label: string; value: string; unit: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-[16px] p-3 flex flex-col gap-1" style={{ background: "var(--surface)" }}>
      <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p
        className="text-xl font-bold leading-none"
        style={{ color: highlight ? "var(--accent)" : "var(--text-primary)" }}
      >
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{unit}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
      <div className="rounded-[20px] p-4" style={{ background: "var(--surface)" }}>
        {children}
      </div>
    </div>
  );
}

function HabitStatRow({ stat }: { stat: HabitStat }) {
  const { habit, completionRate, totalCompleted, totalScheduled } = stat;
  const accent = habit.color ?? "#4CAF82";
  const t = useTranslations("stats");

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
        style={{ background: accent + "20", color: accent }}
      >
        <HabitIcon icon={habit.icon ?? "🎯"} size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {habit.name}
          </p>
          <span className="text-xs ml-2 flex-shrink-0" style={{ color: completionRate >= 80 ? accent : "var(--text-secondary)" }}>
            {completionRate}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${completionRate}%`, background: accent }}
          />
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {totalCompleted}/{totalScheduled} {t("days_unit")}
        </p>
      </div>
    </div>
  );
}

function AchievementCard({ achievement, userAchievement }: {
  achievement: Achievement;
  userAchievement?: UserAchievement;
}) {
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;
  const isUnlocked = Boolean(userAchievement);
  const unlockedDate = userAchievement
    ? format(new Date(userAchievement.unlockedAt), "d MMM yyyy", { locale: dateFnsLocale })
    : null;

  return (
    <div
      className="rounded-[16px] p-3 flex flex-col gap-1.5"
      style={{
        background: isUnlocked ? "rgba(76,207,130,0.08)" : "var(--surface-elevated)",
        border: isUnlocked ? "1px solid rgba(76,207,130,0.2)" : "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl" style={{ opacity: isUnlocked ? 1 : 0.3 }}>
          {achievement.icon}
        </span>
        {isUnlocked && (
          <div className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3l2 2 4-4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div>
        <p
          className="text-xs font-semibold"
          style={{ color: isUnlocked ? "var(--text-primary)" : "var(--text-muted)" }}
        >
          {achievement.name}
        </p>
        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--text-muted)" }}>
          {isUnlocked ? unlockedDate! : achievement.description}
        </p>
      </div>
    </div>
  );
}


function heatmapColor(rate: number, isFuture: boolean): string {
  if (isFuture || rate === -1) return "var(--surface-elevated)";
  if (rate === 0) return "rgba(255,82,82,0.35)";
  if (rate < 50) return "rgba(245,166,35,0.45)";
  if (rate < 100) return "rgba(163,207,138,0.55)";
  return "#4CAF82";
}

function YearlyHeatmap({ days, year }: { days: DayProgress[]; year: number }) {
  const t = useTranslations("stats");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;
  const [selected, setSelected] = useState<DayProgress | null>(null);

  if (days.length === 0) return <div className="h-20" />;

  // Start from the Monday of the week containing Jan 1
  const jan1 = new Date(year, 0, 1);
  const rawDay = jan1.getDay(); // 0=Sun
  const leadingNulls = rawDay === 0 ? 6 : rawDay - 1;

  const allCells: (DayProgress | null)[] = [...Array(leadingNulls).fill(null), ...days];
  const remainder = allCells.length % 7;
  if (remainder !== 0) for (let i = 0; i < 7 - remainder; i++) allCells.push(null);

  const weeks: (DayProgress | null)[][] = [];
  for (let w = 0; w < allCells.length / 7; w++) {
    weeks.push(allCells.slice(w * 7, (w + 1) * 7));
  }

  // Month label positions: week index of first day of each month
  const monthPositions: { month: number; weekIdx: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const firstOfMonth = new Date(year, m, 1);
    const dayOfYear = Math.floor((firstOfMonth.getTime() - jan1.getTime()) / 86400000);
    const weekIdx = Math.floor((dayOfYear + leadingNulls) / 7);
    monthPositions.push({ month: m, weekIdx });
  }

  const CELL = 11; // cell size + gap

  return (
    <div>
      {selected && (
        <div className="mb-3 rounded-[10px] px-3 py-2 flex items-center justify-between"
          style={{ background: "var(--surface-elevated)" }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {format(selected.date, "EEEE d MMMM", { locale: dateFnsLocale }).replace(/^\w/, c => c.toUpperCase())}
          </p>
          {!selected.isFuture && selected.scheduled > 0 ? (
            <p className="text-sm font-semibold" style={{ color: heatmapColor(selected.completionRate, false) }}>
              {selected.completionRate}% · {selected.completed}/{selected.scheduled}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {selected.isFuture ? t("not_yet") : t("no_habits")}
            </p>
          )}
        </div>
      )}
      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ width: weeks.length * CELL + 4 }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: 0 }}>
            {monthPositions.map(({ month, weekIdx }, i) => {
              const nextWeekIdx = i < monthPositions.length - 1 ? monthPositions[i + 1].weekIdx : weeks.length;
              const spanWidth = (nextWeekIdx - weekIdx) * CELL;
              if (spanWidth < CELL * 2) return null;
              return (
                <div key={month} style={{ width: spanWidth, minWidth: spanWidth, marginLeft: i === 0 ? weekIdx * CELL : 0 }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                    {format(new Date(year, month, 1), "MMM", { locale: dateFnsLocale })}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Grid: rows = days of week, columns = weeks */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <button
                    key={di}
                    onClick={() => day && setSelected(prev => prev?.date.getTime() === day.date.getTime() ? null : day)}
                    className="rounded-[2px] flex-shrink-0"
                    style={{
                      width: 8, height: 8,
                      background: day ? heatmapColor(day.completionRate, day.isFuture) : "transparent",
                      outline: selected?.date.getTime() === day?.date.getTime() ? "1px solid rgba(255,255,255,0.6)" : "none",
                      cursor: day ? "pointer" : "default",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  const t = useTranslations("stats");
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("no_data")}</p>
    </div>
  );
}

function getBarFill(rate: number): string {
  if (rate >= 100) return "#4CAF82";
  if (rate >= 75)  return "#A3CF8A";
  if (rate >= 50)  return "#F5A623";
  if (rate > 0)   return "#FF8A65";
  return "var(--border)";
}

function StatsSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-24 rounded-full mb-2" style={{ background: "var(--surface)" }} />
        <div className="h-8 w-40 rounded-full" style={{ background: "var(--surface)" }} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[16px] h-20" style={{ background: "var(--surface)" }} />
        ))}
      </div>
      <div className="rounded-[20px] h-48 mb-6" style={{ background: "var(--surface)" }} />
      <div className="rounded-[20px] h-40 mb-6" style={{ background: "var(--surface)" }} />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-[16px] h-24" style={{ background: "var(--surface)" }} />
        ))}
      </div>
    </div>
  );
}
