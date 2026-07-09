import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export type ExerciseType = "strength" | "cardio";

/** Entrada del catálogo — solo alimenta el autocompletado, no es fuente de verdad en render. */
export interface ExerciseCatalogItem {
  id: UUID;
  userId: UUID;
  name: string;
  defaultType: ExerciseType | null;
  createdAt: ISOTimestamp;
}

export interface WorkoutExercise {
  id: UUID;
  workoutId: UUID;
  userId: UUID;
  catalogExerciseId: UUID | null;
  name: string;            // denormalizado — renombrar/borrar del catálogo nunca rompe esto
  type: ExerciseType;       // tipo por ejercicio, distinto de Workout.type (permite workouts "Mixed")
  order: number;
  sets: number | null;     // opcional — cuántas series, nunca reps/peso
  notes: string | null;    // opcional, texto libre
  createdAt: ISOTimestamp;
}

export interface CreateWorkoutExerciseInput {
  workoutId: UUID;
  catalogExerciseId?: UUID | null;
  name: string;
  type: ExerciseType;
  sets?: number | null;
  notes?: string | null;
}

export interface UpdateWorkoutExerciseInput {
  name?: string;
  type?: ExerciseType;
  order?: number;
  sets?: number | null;
  notes?: string | null;
}
