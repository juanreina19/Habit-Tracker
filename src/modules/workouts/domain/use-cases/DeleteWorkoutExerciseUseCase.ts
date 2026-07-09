import type { IWorkoutExerciseRepository } from "../repositories/IWorkoutExerciseRepository";
import type { UUID } from "@/shared/types/database.types";

export class DeleteWorkoutExerciseUseCase {
  constructor(private readonly repo: IWorkoutExerciseRepository) {}

  async execute(id: UUID): Promise<void> {
    return this.repo.delete(id);
  }
}
