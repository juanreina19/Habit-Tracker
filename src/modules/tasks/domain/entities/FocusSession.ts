import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export type FocusSessionStatus =
  | "completed"  // elapsedSec >= durationMin*60 al finalizar (llegó al objetivo, con o sin tiempo extra)
  | "abandoned"; // elapsedSec < durationMin*60 al finalizar (el usuario presionó "Finalizar" antes de llegar al objetivo)

export interface FocusSession {
  id: UUID;
  userId: UUID;
  taskId: UUID;
  durationMin: number;     // duración planificada de ESTA sesión (snapshot de task.focusDurationMin al iniciar)
  startedAt: ISOTimestamp;
  endedAt: ISOTimestamp;
  elapsedSec: number;      // tiempo real enfocado (puede ser > durationMin*60 si el usuario "Continuó trabajando")
  status: FocusSessionStatus;
  createdAt: ISOTimestamp;
}

export interface CreateFocusSessionInput {
  taskId: UUID;
  durationMin: number;
  startedAt: ISOTimestamp;
  endedAt: ISOTimestamp;
  elapsedSec: number;
  status: FocusSessionStatus;
}
