/**
 * Letras de día de la semana, índice 0=lunes..6=domingo (usar con
 * dayOfWeek()-1, donde dayOfWeek() devuelve 1..7). Extraído tras su 3er
 * consumidor real (HabitFormDialog, HabitsView, WeeklyScheduleStrip) — antes
 * de eso era un literal duplicado, no justificaba una abstracción compartida.
 */
export const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const;

/**
 * Claves i18n (namespace "workouts") de abreviaturas de 3 letras, mismo
 * índice 0=lunes que DAY_LETTERS — para los sitios donde una sola letra es
 * ambigua (filas de template, "próximo entrenamiento").
 */
export const DAY_ABBR_KEYS = [
  "day_mon",
  "day_tue",
  "day_wed",
  "day_thu",
  "day_fri",
  "day_sat",
  "day_sun",
] as const;

/**
 * Claves i18n (namespace "workouts") de una sola letra, mismo índice
 * 0=lunes — usadas solo por WeeklyScheduleStrip para que la inicial
 * respete el idioma (DAY_LETTERS sigue fijo en español para sus otros 5
 * consumidores, no mencionados en este pedido).
 */
export const DAY_LETTER_KEYS = [
  "day_letter_mon",
  "day_letter_tue",
  "day_letter_wed",
  "day_letter_thu",
  "day_letter_fri",
  "day_letter_sat",
  "day_letter_sun",
] as const;
