"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import { EXERCISE_TYPE_COLORS } from "../constants/workoutColors";
import type { WorkoutWithStatus } from "../../domain/entities/Workout";

interface WorkoutStats {
  streak: number;
  weeklyConsistencyPct: number;
  monthlyCounts: { month: string; count: number }[];
  recentCompletions: { workoutId: string; workoutName: string; completedAt: string; durationMin: number | null }[];
  strengthPct: number;
  cardioPct: number;
  nextWorkout: WorkoutWithStatus | null;
  topExercises: { name: string; count: number }[];
}

interface Props {
  stats: WorkoutStats;
}

/** Título de sección — sin negrita, gris apagado (var(--text-muted), no
 *  --text-secondary) para que se lea como metadata, no como encabezado. */
function StatTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

/**
 * Panel de widgets pequeños — un solo sitio de uso, mismo precedente "una
 * pantalla, un panel de stats" que StudyStatsPanel.tsx. Las secciones no
 * son cajas con borde propio — fluyen en una sola columna, separadas por
 * una línea horizontal entre ellas (border-top), no un grid de cards.
 */
export function WorkoutStatsPanel({ stats }: Props) {
  const t = useTranslations("workouts");
  const maxTopExerciseCount = stats.topExercises[0]?.count ?? 1;
  const sectionStyle = { borderTop: "1px solid var(--border)", paddingTop: "1rem" };

  return (
    <div className="flex flex-col gap-4">
      {/* Racha + consistencia semanal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-3xl tabular-nums" style={{ color: "var(--text-primary)" }}>
            {stats.streak}
          </p>
          <p className="text-[11px] mt-1 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {t("stats_streak")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-3xl tabular-nums" style={{ color: "var(--text-primary)" }}>
            {stats.weeklyConsistencyPct}%
          </p>
          <p className="text-[11px] mt-1 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {t("stats_weekly_consistency")}
          </p>
        </div>
      </div>

      {/* Próximo entrenamiento */}
      <div style={sectionStyle}>
        <StatTitle>{t("stats_next_workout")}</StatTitle>
        {stats.nextWorkout ? (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--text-primary)" }}>{stats.nextWorkout.name}</p>
            <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              {stats.nextWorkout.dayOfWeek ? DAY_LETTERS[stats.nextWorkout.dayOfWeek - 1] : t("any_day")}
              {stats.nextWorkout.startTime ? ` · ${formatTaskTime(stats.nextWorkout.startTime)}` : ""}
            </span>
          </div>
        ) : (
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{t("no_workouts")}</p>
        )}
      </div>

      {/* Progreso mensual — 4 bloques horizontales, uno por semana del mes
          (puramente decorativos, no atados a datos — evita depender de los
          ticks auto-calculados del eje Y de recharts para tener siempre
          exactamente 4). Las líneas terminan antes de la fila de meses
          (bottom-[18px], no inset-0) para no cruzar las etiquetas. El
          dominio del eje Y queda fijo en [0,4] para que la barra suba
          exactamente hasta el bloque/semana que corresponda. */}
      <div style={sectionStyle}>
        <StatTitle>{t("stats_monthly")}</StatTitle>
        <div className="relative h-24 mt-2">
          <div className="absolute inset-x-0 top-0 bottom-[18px] flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-full h-px" style={{ background: "var(--text-muted)" }} />
            ))}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyCounts} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 4]} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Bar dataKey="count" fill="var(--text-primary)" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* % Fuerza / Cardio — a nivel de ejercicio, para que Mixed se reparta bien */}
      {(stats.strengthPct > 0 || stats.cardioPct > 0) && (
        <div style={sectionStyle}>
          <StatTitle>{t("stats_strength_cardio")}</StatTitle>
          <div className="h-2 rounded-full overflow-hidden flex mt-3" style={{ background: "var(--border)" }}>
            <div style={{ width: `${stats.strengthPct}%`, background: EXERCISE_TYPE_COLORS.strength }} />
            <div style={{ width: `${stats.cardioPct}%`, background: EXERCISE_TYPE_COLORS.cardio }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span>{t("type_strength")} {stats.strengthPct}%</span>
            <span>{t("type_cardio")} {stats.cardioPct}%</span>
          </div>
        </div>
      )}

      {/* Ejercicios principales */}
      {stats.topExercises.length > 0 && (
        <div style={sectionStyle}>
          <StatTitle>{t("stats_top_exercises")}</StatTitle>
          <div className="flex flex-col gap-2 mt-3">
            {stats.topExercises.map((ex) => (
              <div key={ex.name} className="flex items-center gap-3">
                <span className="text-xs w-20 flex-shrink-0 truncate" style={{ color: "var(--text-primary)" }}>{ex.name}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(ex.count / maxTopExerciseCount) * 100}%`, background: "var(--text-primary)" }}
                  />
                </div>
                <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>{ex.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recientes */}
      <div style={sectionStyle}>
        <StatTitle>{t("stats_recent")}</StatTitle>
        {stats.recentCompletions.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>{t("no_recent_workouts")}</p>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {stats.recentCompletions.map((c, idx) => (
              <div key={`${c.workoutId}-${c.completedAt}-${idx}`} className="flex items-center gap-3 px-3 py-2 rounded-md" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
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
