import type { IWorkoutExerciseRepository } from "../repositories/IWorkoutExerciseRepository";
import type { UUID } from "@/shared/types/database.types";
import type { ExerciseCatalogItem, ExerciseType } from "../entities/WorkoutExercise";

export class UpdateExerciseCatalogUseCase {
  constructor(private readonly repo: IWorkoutExerciseRepository) {}

  async execute(id: UUID, input: { name?: string; defaultType?: ExerciseType | null }): Promise<ExerciseCatalogItem> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("Exercise name cannot be empty");
    }
    return this.repo.updateCatalogEntry(id, input);
  }
}
