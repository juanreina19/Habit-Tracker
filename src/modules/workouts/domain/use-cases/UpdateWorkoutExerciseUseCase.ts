import type { IWorkoutExerciseRepository } from "../repositories/IWorkoutExerciseRepository";
import type { UUID } from "@/shared/types/database.types";
import type { WorkoutExercise, UpdateWorkoutExerciseInput } from "../entities/WorkoutExercise";

export class UpdateWorkoutExerciseUseCase {
  constructor(private readonly repo: IWorkoutExerciseRepository) {}

  async execute(id: UUID, input: UpdateWorkoutExerciseInput): Promise<WorkoutExercise> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("Exercise name cannot be empty");
    }
    return this.repo.update(id, input);
  }
}
