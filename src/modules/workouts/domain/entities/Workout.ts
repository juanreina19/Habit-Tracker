import type { UUID, ISOTimestamp } from "@/shared/types/database.types";
import type { WorkoutExercise } from "./WorkoutExercise";

export type WorkoutType = "strength" | "cardio" | "mixed";

export interface Workout {
  id: UUID;
  userId: UUID;
  categoryId: UUID | null;
  name: string;
  type: WorkoutType;
  dayOfWeek: number;      // 1..7, 1=lunes..7=domingo — misma convención que Habit.activeDays
  startTime: string | null;   // "HH:mm"
  estimatedDurationMin: number | null;
  order: number;          // desambigua si dos workouts comparten dayOfWeek (ej. AM/PM)
  isActive: boolean;
  createdAt: ISOTimestamp;
}

/** Read model enriquecido para presentación: trae sus ejercicios embebidos
 *  (no un accordion perezoso como Studies) y si ya se completó hoy/en la
 *  fecha consultada. */
export interface WorkoutWithStatus extends Workout {
  exercises: WorkoutExercise[];
  isCompletedToday: boolean;
}

export interface CreateWorkoutInput {
  categoryId?: UUID | null;
  name: string;
  type: WorkoutType;
  dayOfWeek: number;
  startTime?: string | null;
  estimatedDurationMin?: number | null;
}

export interface UpdateWorkoutInput {
  categoryId?: UUID | null;
  name?: string;
  type?: WorkoutType;
  dayOfWeek?: number;
  startTime?: string | null;
  estimatedDurationMin?: number | null;
  order?: number;
  isActive?: boolean;
}
