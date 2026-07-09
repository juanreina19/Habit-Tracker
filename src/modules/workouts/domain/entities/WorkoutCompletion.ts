import type { UUID, ISODate, ISOTimestamp } from "@/shared/types/database.types";

export interface WorkoutCompletion {
  id: UUID;
  workoutId: UUID;
  userId: UUID;
  completedAt: ISODate;       // el día calendario en que se hizo — igual que un habit_log
  durationMin: number | null; // opcional, nunca bloquea el completado
  createdAt: ISOTimestamp;
}

export interface LogWorkoutCompletionInput {
  workoutId: UUID;
  completedAt: ISODate;
  durationMin?: number | null;
}
