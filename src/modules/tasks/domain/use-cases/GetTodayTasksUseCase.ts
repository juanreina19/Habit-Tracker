import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { UUID } from "@/shared/types/database.types";
import type { Task } from "../entities/Task";

export class GetTodayTasksUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(userId: UUID): Promise<Task[]> {
    return this.repo.findForToday(userId);
  }
}
