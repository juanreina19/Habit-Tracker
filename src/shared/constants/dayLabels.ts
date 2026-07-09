/**
 * Letras de día de la semana, índice 0=lunes..6=domingo (usar con
 * dayOfWeek()-1, donde dayOfWeek() devuelve 1..7). Extraído tras su 3er
 * consumidor real (HabitFormDialog, HabitsView, WeeklyScheduleStrip) — antes
 * de eso era un literal duplicado, no justificaba una abstracción compartida.
 */
export const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const;
