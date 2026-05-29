"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useStats } from "../hooks/useStats";
import type { HabitStat, WeekTrend } from "../../domain/use-cases/GetStatsUseCase";
import type { Achievement, UserAchievement } from "@/modules/achievements/domain/entities/Achievement";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  userCreatedAt?: string;
}

export default function StatsView({ userId, userCreatedAt }: Props) {
  const { data, isLoading, error } = useStats(userId, userCreatedAt);
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
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm font-medium" style={{ color: "#8888AA" }}>
          {format(new Date(), "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
        </p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "#FFFFFF" }}>
          Estadísticas
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Activos" value={activeHabitsCount.toString()} unit="hábitos" />
        <StatCard label="Racha actual" value={bestCurrentStreak.toString()} unit="días" highlight={bestCurrentStreak >= 7} />
        <StatCard label="Este mes" value={`${monthlyRate}%`} unit="completado" highlight={monthlyRate >= 80} />
      </div>

      {/* Weekly trend chart */}
      <Section title="Tendencia semanal">
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
                    color: "#FFFFFF",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value}%`, "Completado"]}
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
        <Section title="Por hábito — últimos 30 días">
          <div className="flex flex-col gap-3">
            {habitStats.map((hs) => (
              <HabitStatRow key={hs.habit.id} stat={hs} />
            ))}
          </div>
        </Section>
      )}

      {/* Achievements */}
      <Section title="Logros">
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
          <p className="text-center text-xs mt-4" style={{ color: "#8888AA" }}>
            Mejor racha histórica: <span style={{ color: "#FFFFFF" }}>{bestEverStreak} días</span>
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
    <div className="rounded-[16px] p-3 flex flex-col gap-1" style={{ background: "#111111" }}>
      <p className="text-[10px] font-medium" style={{ color: "#8888AA" }}>{label}</p>
      <p
        className="text-xl font-bold leading-none"
        style={{ color: highlight ? "#4CAF82" : "#FFFFFF" }}
      >
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "#555555" }}>{unit}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8888AA" }}>
        {title}
      </p>
      <div className="rounded-[20px] p-4" style={{ background: "#111111" }}>
        {children}
      </div>
    </div>
  );
}

function HabitStatRow({ stat }: { stat: HabitStat }) {
  const { habit, completionRate, totalCompleted, totalScheduled } = stat;
  const accent = habit.color ?? "#4CAF82";

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: accent + "20" }}
      >
        {habit.icon ?? "🎯"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium truncate" style={{ color: "#FFFFFF" }}>
            {habit.name}
          </p>
          <span className="text-xs ml-2 flex-shrink-0" style={{ color: completionRate >= 80 ? accent : "#8888AA" }}>
            {completionRate}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2A2A2A" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${completionRate}%`, background: accent }}
          />
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: "#555555" }}>
          {totalCompleted} de {totalScheduled} días
        </p>
      </div>
    </div>
  );
}

function AchievementCard({ achievement, userAchievement }: {
  achievement: Achievement;
  userAchievement?: UserAchievement;
}) {
  const isUnlocked = Boolean(userAchievement);
  const unlockedDate = userAchievement
    ? format(new Date(userAchievement.unlockedAt), "d MMM yyyy", { locale: es })
    : null;

  return (
    <div
      className="rounded-[16px] p-3 flex flex-col gap-1.5"
      style={{
        background: isUnlocked ? "rgba(76,207,130,0.08)" : "#1A1A1A",
        border: isUnlocked ? "1px solid rgba(76,207,130,0.2)" : "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl" style={{ opacity: isUnlocked ? 1 : 0.3 }}>
          {achievement.icon}
        </span>
        {isUnlocked && (
          <div className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "#4CAF82" }}>
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3l2 2 4-4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div>
        <p
          className="text-xs font-semibold"
          style={{ color: isUnlocked ? "#FFFFFF" : "#555555" }}
        >
          {achievement.name}
        </p>
        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "#555555" }}>
          {isUnlocked ? unlockedDate! : achievement.description}
        </p>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm" style={{ color: "#555555" }}>Sin datos aún</p>
    </div>
  );
}

function getBarFill(rate: number): string {
  if (rate >= 100) return "#4CAF82";
  if (rate >= 75)  return "#A3CF8A";
  if (rate >= 50)  return "#F5A623";
  if (rate > 0)   return "#FF8A65";
  return "#2A2A2A";
}

function StatsSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-24 rounded-full mb-2" style={{ background: "#111111" }} />
        <div className="h-8 w-40 rounded-full" style={{ background: "#111111" }} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[16px] h-20" style={{ background: "#111111" }} />
        ))}
      </div>
      <div className="rounded-[20px] h-48 mb-6" style={{ background: "#111111" }} />
      <div className="rounded-[20px] h-40 mb-6" style={{ background: "#111111" }} />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-[16px] h-24" style={{ background: "#111111" }} />
        ))}
      </div>
    </div>
  );
}
