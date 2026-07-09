"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import { WORKOUT_TYPE_COLORS } from "../constants/workoutColors";
import type { WorkoutWithStatus } from "../../domain/entities/Workout";

interface WorkoutStats {
  streak: number;
  weeklyConsistencyPct: number;
  monthlyCounts: { month: string; count: number }[];
  recentCompletions: { workoutId: string; workoutName: string; completedAt: string; durationMin: number | null }[];
  strengthPct: number;
  cardioPct: number;
  nextWorkout: WorkoutWithStatus | null;
}

interface Props {
  stats: WorkoutStats;
}

/**
 * Panel de widgets pequeños — un solo sitio de uso, mismo precedente "una
 * pantalla, un panel de stats" que StudyStatsPanel.tsx. Nada de dashboards
 * grandes: solo lo pedido (progreso mensual, recientes, %fuerza/cardio,
 * próximo entrenamiento, racha, consistencia semanal).
 */
export function WorkoutStatsPanel({ stats }: Props) {
  const t = useTranslations("workouts");

  return (
    <div className="flex flex-col gap-4">
      {/* Racha + consistencia semanal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-3xl font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
            {stats.streak}
          </p>
          <p className="text-[11px] mt-1 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            {t("stats_streak")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
            {stats.weeklyConsistencyPct}%
          </p>
          <p className="text-[11px] mt-1 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            {t("stats_weekly_consistency")}
          </p>
        </div>
      </div>

      {/* Próximo entrenamiento */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--text-secondary)" }}>
          {t("stats_next_workout")}
        </p>
        {stats.nextWorkout ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: WORKOUT_TYPE_COLORS[stats.nextWorkout.type] }} />
            <p className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--text-primary)" }}>{stats.nextWorkout.name}</p>
            <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              {DAY_LETTERS[stats.nextWorkout.dayOfWeek - 1]}
              {stats.nextWorkout.startTime ? ` · ${formatTaskTime(stats.nextWorkout.startTime)}` : ""}
            </span>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("no_workouts")}</p>
        )}
      </div>

      {/* Progreso mensual — barras simples */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--text-secondary)" }}>
          {t("stats_monthly")}
        </p>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyCounts}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* % Fuerza / Cardio — a nivel de ejercicio, para que Mixed se reparta bien */}
      {(stats.strengthPct > 0 || stats.cardioPct > 0) && (
        <div className="rounded-lg p-4" style={{ background: "var(--surface)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-secondary)" }}>
            {t("stats_strength_cardio")}
          </p>
          <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "var(--border)" }}>
            <div style={{ width: `${stats.strengthPct}%`, background: WORKOUT_TYPE_COLORS.strength }} />
            <div style={{ width: `${stats.cardioPct}%`, background: WORKOUT_TYPE_COLORS.cardio }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span>{t("type_strength")} {stats.strengthPct}%</span>
            <span>{t("type_cardio")} {stats.cardioPct}%</span>
          </div>
        </div>
      )}

      {/* Recientes */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-secondary)" }}>
          {t("stats_recent")}
        </p>
        {stats.recentCompletions.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>{t("no_recent_workouts")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.recentCompletions.map((c, idx) => (
              <div key={`${c.workoutId}-${c.completedAt}-${idx}`} className="flex items-center gap-3 px-3 py-2 rounded-md" style={{ background: "var(--surface-elevated)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{c.workoutName}</p>
                </div>
                {c.durationMin && (
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{c.durationMin} min</span>
                )}
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {format(new Date(c.completedAt), "dd/MM")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
