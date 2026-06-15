import type { ISubtaskRepository } from "../repositories/ISubtaskRepository";
import type { UUID } from "@/shared/types/database.types";

export class GetSubtaskCountsUseCase {
  constructor(private readonly repo: ISubtaskRepository) {}

  async execute(taskIds: UUID[]): Promise<Map<UUID, { total: number; completed: number }>> {
    return this.repo.countByTasks(taskIds);
  }
}
