import type { IWorkoutRepository } from "../repositories/IWorkoutRepository";
import type { UUID, ISODate } from "@/shared/types/database.types";

export class UncompleteWorkoutUseCase {
  constructor(private readonly repo: IWorkoutRepository) {}

  async execute(workoutId: UUID, completedAt: ISODate): Promise<void> {
    return this.repo.removeCompletion(workoutId, completedAt);
  }
}
