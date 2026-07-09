import type { IWorkoutRepository } from "../repositories/IWorkoutRepository";
import type { UUID } from "@/shared/types/database.types";
import type { WorkoutCompletion, LogWorkoutCompletionInput } from "../entities/WorkoutCompletion";

/** Marcar un workout como completado es un solo tap, sin fricción — igual
 *  que Habits. durationMin es opcional y nunca bloquea esta acción. */
export class CompleteWorkoutUseCase {
  constructor(private readonly repo: IWorkoutRepository) {}

  async execute(userId: UUID, input: LogWorkoutCompletionInput): Promise<WorkoutCompletion> {
    return this.repo.logCompletion(userId, input);
  }
}
