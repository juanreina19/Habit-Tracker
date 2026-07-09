import type { IWorkoutRepository } from "../repositories/IWorkoutRepository";
import type { UUID } from "@/shared/types/database.types";
import type { Workout, CreateWorkoutInput } from "../entities/Workout";

export class CreateWorkoutUseCase {
  constructor(private readonly repo: IWorkoutRepository) {}

  async execute(userId: UUID, input: CreateWorkoutInput): Promise<Workout> {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error("Workout name cannot be empty");
    if (input.dayOfWeek < 1 || input.dayOfWeek > 7) {
      throw new Error("dayOfWeek must be between 1 (Monday) and 7 (Sunday)");
    }

    return this.repo.create(userId, { ...input, name: trimmed });
  }
}
