import type { UUID, ISODate, ISOTimestamp } from "@/shared/types/database.types";

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id:             UUID;
  userId:         UUID;
  title:          string;
  description:    string | null;
  priority:       TaskPriority;
  dueDate:        ISODate | null;
  recurrenceDays: number[] | null;   // null=única, [1..7]=recurrente (1=lun, 7=dom)
  startTime:      string | null;     // "HH:MM:SS" (normalizado por Supabase desde TIME)
  endTime:        string | null;     // "HH:MM:SS"
  completedAt:    ISOTimestamp | null;  // solo para tareas únicas
  createdAt:      ISOTimestamp;
}

/** Read model enriquecido para presentación y queries. */
export interface TaskWithStatus extends Task {
  isCompletedToday: boolean;
  // Tareas únicas:    isCompletedToday = completedAt !== null
  // Tareas recurrentes: isCompletedToday = existe row en task_completions para hoy
}

export const isRecurring = (t: Task): boolean =>
  Array.isArray(t.recurrenceDays) && t.recurrenceDays.length > 0;

export const isTaskDone = (t: Task | TaskWithStatus): boolean =>
  'isCompletedToday' in t ? (t as TaskWithStatus).isCompletedToday : t.completedAt !== null;

/** Formatea un string de tiempo "HH:MM:SS" → "HH:MM" para display. */
export const formatTaskTime = (t: string): string => t.slice(0, 5);

/**
 * Devuelve true si el endTime de la tarea ya pasó hoy.
 * Solo aplica cuando la tarea tiene endTime definido.
 * Una tarea expirada no puede marcarse como completada.
 */
export const isTaskTimeExpired = (t: Task | TaskWithStatus): boolean => {
  if (!t.endTime) return false;
  const [h, m] = t.endTime.split(":").map(Number);
  const endMinutes = h * 60 + m;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > endMinutes;
};

export interface CreateTaskInput {
  title:           string;
  description?:    string;
  priority?:       TaskPriority;   // default: 'medium'
  dueDate?:        ISODate;        // solo para tareas únicas
  recurrenceDays?: number[];       // undefined/[] = única
  startTime?:      string;         // "HH:MM"
  endTime?:        string;         // "HH:MM"
}

export interface UpdateTaskInput {
  title?:          string;
  description?:    string | null;
  priority?:       TaskPriority;
  dueDate?:        ISODate | null;
  recurrenceDays?: number[] | null;
  startTime?:      string | null;
  endTime?:        string | null;
  completedAt?:    ISOTimestamp | null;  // gestionado exclusivamente por ToggleTaskUseCase
}
