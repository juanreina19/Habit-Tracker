import { parseISO, subDays } from "date-fns";
import { dayOfWeek, toISODate } from "@/shared/lib/utils/dates";
import type { ISODate } from "@/shared/types/database.types";
import type { Workout } from "../../entities/Workout";
import type { WorkoutCompletion } from "../../entities/WorkoutCompletion";

export interface WorkoutConsistencyResult {
  streak: number;
  weeklyConsistencyPct: number; // % de workouts programados en los últimos 7 días que se completaron
}

/**
 * Función pura (no toca repositorio, por eso vive en lib/ y no es un
 * use-case) que calcula racha y consistencia semanal a partir de los
 * workouts y completions ya cargados por useWorkouts. Toma prestado el
 * algoritmo de recorrido día-a-día de CalculateStreakUseCase (Habits) —
 * los días sin ningún workout programado no rompen la racha — pero sin su
 * mecánica de freeze ni persistencia: se recalcula en cada render, igual
 * que el modelo de Studies.
 */
export function calculateWorkoutConsistency(
  workouts: Pick<Workout, "id" | "dayOfWeek" | "isActive">[],
  completions: Pick<WorkoutCompletion, "workoutId" | "completedAt">[],
  todayStr: ISODate
): WorkoutConsistencyResult {
  const activeWorkouts = workouts.filter((w) => w.isActive);
  const completedSet = new Set(completions.map((c) => `${c.workoutId}:${c.completedAt}`));

  const isDayFullyDone = (isoDate: ISODate, dow: number): boolean => {
    const scheduled = activeWorkouts.filter((w) => w.dayOfWeek.includes(dow));
    if (scheduled.length === 0) return true; // día sin nada programado: no cuenta ni rompe
    return scheduled.every((w) => completedSet.has(`${w.id}:${isoDate}`));
  };

  const hasAnyScheduled = (dow: number): boolean =>
    activeWorkouts.some((w) => w.dayOfWeek.includes(dow));

  // Racha: recorrido hacia atrás desde hoy. Días sin nada programado no
  // rompen la racha; un día programado sin completar sí la rompe (incluido
  // hoy, si aún no se completó — mismo comportamiento que Habits).
  let streak = 0;
  let date = parseISO(todayStr);
  for (let i = 0; i < 365; i++) {
    const isoDate = toISODate(date);
    const dow = dayOfWeek(date);
    if (!hasAnyScheduled(dow)) {
      date = subDays(date, 1);
      continue;
    }
    if (isDayFullyDone(isoDate, dow)) {
      streak++;
      date = subDays(date, 1);
    } else {
      break;
    }
  }

  // Consistencia semanal: últimos 7 días (incluye hoy).
  let scheduledCount = 0;
  let completedCount = 0;
  let d = parseISO(todayStr);
  for (let i = 0; i < 7; i++) {
    const isoDate = toISODate(d);
    const dow = dayOfWeek(d);
    const scheduled = activeWorkouts.filter((w) => w.dayOfWeek.includes(dow));
    scheduledCount += scheduled.length;
    completedCount += scheduled.filter((w) => completedSet.has(`${w.id}:${isoDate}`)).length;
    d = subDays(d, 1);
  }
  const weeklyConsistencyPct = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  return { streak, weeklyConsistencyPct };
}
