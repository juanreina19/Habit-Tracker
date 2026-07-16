import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export type ExerciseType = "strength" | "cardio";

/** El flujo de creación solo pide el nombre — estos defaults dejan el
 *  ejercicio usable de inmediato ("3x10"), editable después. */
export const DEFAULT_EXERCISE_SETS = 3;
export const DEFAULT_EXERCISE_REPS = 10;

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
  type: ExerciseType;       // tipo por ejercicio (permite workouts con ejercicios mixtos)
  order: number;
  sets: number | null;     // objetivo de plan (estilo "3x10"), nunca un registro de lo realizado
  reps: number | null;     // ídem — nunca peso/RM/volumen
  durationMin: number | null; // alternativa a reps para ejercicios por tiempo ("5 min" de bici) —
                              // el modo se infiere de cuál de los dos está poblado, no hay campo aparte
  notes: string | null;    // opcional, texto libre
  createdAt: ISOTimestamp;
}

export interface CreateWorkoutExerciseInput {
  workoutId: UUID;
  catalogExerciseId?: UUID | null;
  name: string;
  type: ExerciseType;
  sets?: number | null;
  reps?: number | null;
  durationMin?: number | null;
  notes?: string | null;
}

export interface UpdateWorkoutExerciseInput {
  name?: string;
  type?: ExerciseType;
  order?: number;
  sets?: number | null;
  reps?: number | null;
  durationMin?: number | null;
  notes?: string | null;
}
