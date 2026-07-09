import type { IWorkoutExerciseRepository } from "../repositories/IWorkoutExerciseRepository";
import type { UUID } from "@/shared/types/database.types";

export class ReorderWorkoutExercisesUseCase {
  constructor(private readonly repo: IWorkoutExerciseRepository) {}

  async execute(orderedIds: UUID[]): Promise<void> {
    return this.repo.reorder(orderedIds);
  }
}
