import type { IWorkoutRepository } from "../repositories/IWorkoutRepository";
import type { UUID } from "@/shared/types/database.types";
import type { Workout, UpdateWorkoutInput } from "../entities/Workout";

export class UpdateWorkoutUseCase {
  constructor(private readonly repo: IWorkoutRepository) {}

  async execute(id: UUID, input: UpdateWorkoutInput): Promise<Workout> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("Workout name cannot be empty");
    }
    if (input.dayOfWeek != null && (input.dayOfWeek < 1 || input.dayOfWeek > 7)) {
      throw new Error("dayOfWeek must be between 1 (Monday) and 7 (Sunday)");
    }

    return this.repo.update(id, input);
  }
}
