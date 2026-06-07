import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { UUID, ISODate } from "@/shared/types/database.types";
import type { TaskWithStatus } from "../entities/Task";

export class GetTasksUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(userId: UUID, today: ISODate): Promise<TaskWithStatus[]> {
    return this.repo.findAllByUser(userId, today);
  }
}
