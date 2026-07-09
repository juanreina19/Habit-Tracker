import type { IWorkoutRepository } from "../repositories/IWorkoutRepository";
import type { UUID } from "@/shared/types/database.types";

export class DeleteWorkoutUseCase {
  constructor(private readonly repo: IWorkoutRepository) {}

  async execute(id: UUID): Promise<void> {
    return this.repo.delete(id);
  }
}
