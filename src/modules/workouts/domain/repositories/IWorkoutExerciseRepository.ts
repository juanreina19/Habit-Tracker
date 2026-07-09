import type { UUID } from "@/shared/types/database.types";
import type { WorkoutExercise, CreateWorkoutExerciseInput, UpdateWorkoutExerciseInput, ExerciseCatalogItem, ExerciseType } from "../entities/WorkoutExercise";

export interface IWorkoutExerciseRepository {
  listByWorkout(workoutId: UUID): Promise<WorkoutExercise[]>;
  create(userId: UUID, input: CreateWorkoutExerciseInput): Promise<WorkoutExercise>;
  update(id: UUID, input: UpdateWorkoutExerciseInput): Promise<WorkoutExercise>;
  delete(id: UUID): Promise<void>;
  reorder(orderedIds: UUID[]): Promise<void>;

  /** Autocompletado — no es fuente de verdad, solo sugerencias. */
  searchCatalog(userId: UUID, query: string): Promise<ExerciseCatalogItem[]>;
  /** Upsert case-insensitive por nombre — se llama internamente al crear un ejercicio. */
  upsertCatalogEntry(userId: UUID, name: string, defaultType: ExerciseType | null): Promise<ExerciseCatalogItem>;
}
