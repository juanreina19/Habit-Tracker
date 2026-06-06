import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { Task } from "../entities/Task";
import { isTaskDone } from "../entities/Task";

export class ToggleTaskUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(task: Task): Promise<Task> {
    const completedAt = isTaskDone(task) ? null : new Date().toISOString();
    return this.repo.update(task.id, { completedAt });
  }
}
