import type { UUID, ISODate } from "@/shared/types/database.types";
import type { Workout, WorkoutWithStatus, CreateWorkoutInput, UpdateWorkoutInput } from "../entities/Workout";
import type { WorkoutCompletion, LogWorkoutCompletionInput } from "../entities/WorkoutCompletion";

export interface IWorkoutRepository {
  /** Trae todos los workouts activos del usuario con sus ejercicios embebidos
   *  y si ya se completaron en `todayStr` — sin accordion perezoso. */
  findAllByUser(userId: UUID, todayStr: ISODate): Promise<WorkoutWithStatus[]>;
  create(userId: UUID, input: CreateWorkoutInput): Promise<Workout>;
  update(id: UUID, input: UpdateWorkoutInput): Promise<Workout>;
  delete(id: UUID): Promise<void>;
  /** Reordena los workouts que comparten el mismo día (ej. AM/PM). */
  reorder(orderedIds: UUID[]): Promise<void>;

  logCompletion(userId: UUID, input: LogWorkoutCompletionInput): Promise<WorkoutCompletion>;
  removeCompletion(workoutId: UUID, completedAt: ISODate): Promise<void>;
  /** Historial de completions del usuario, para stats/streak — sin límite de rango por ahora. */
  findCompletionsByUser(userId: UUID): Promise<WorkoutCompletion[]>;
}
