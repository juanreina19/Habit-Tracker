import type { UUID, ISODate, ISOTimestamp } from "@/shared/types/database.types";

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id:          UUID;
  userId:      UUID;
  title:       string;
  description: string | null;
  priority:    TaskPriority;
  dueDate:     ISODate | null;
  completedAt: ISOTimestamp | null;  // null = pendiente, timestamp = completada
  createdAt:   ISOTimestamp;
}

export const isTaskDone = (t: Task): boolean => t.completedAt !== null;

export interface CreateTaskInput {
  title:        string;
  description?: string;
  priority?:    TaskPriority;
  dueDate?:     ISODate;
}

export interface UpdateTaskInput {
  title?:       string;
  description?: string | null;
  priority?:    TaskPriority;
  dueDate?:     ISODate | null;
  completedAt?: ISOTimestamp | null;  // gestionado exclusivamente por ToggleTaskUseCase
}
