import { format } from "date-fns";
import { isTaskDone } from "./Task";
import type { TaskWithStatus } from "./Task";

/**
 * True si la tarea está atrasada respecto a `todayStr`: tiene dueDate pasado y,
 * si ya está completada, no se completó hoy (una recurrente completada hoy
 * sigue contando como "de hoy", no como atrasada). Depende del momento en que
 * se evalúa (no es una propiedad intrínseca de la entidad), por eso vive aquí
 * y no en Task.ts.
 */
export function isTaskOverdue(task: TaskWithStatus, todayStr: string): boolean {
  if (task.dueDate === null || task.dueDate >= todayStr) return false;
  if (!isTaskDone(task)) return true;
  const completedToday = task.recurrenceDays
    ? task.isCompletedToday
    : (task.completedAt ? format(new Date(task.completedAt), "yyyy-MM-dd") === todayStr : false);
  return completedToday;
}
