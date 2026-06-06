import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { UUID } from "@/shared/types/database.types";
import type { Task } from "../entities/Task";

export class GetTasksUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(userId: UUID): Promise<Task[]> {
    return this.repo.findAllByUser(userId);
  }
}
