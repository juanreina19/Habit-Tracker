import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { ISODate } from "@/shared/types/database.types";
import type { TaskWithStatus } from "../entities/Task";
import { isRecurring } from "../entities/Task";

export class ToggleTaskUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(task: TaskWithStatus, date: ISODate): Promise<void> {
    if (isRecurring(task)) {
      if (task.isCompletedToday) {
        await this.repo.removeCompletion(task.id, task.userId, date);
      } else {
        await this.repo.addCompletion(task.id, task.userId, date);
      }
    } else {
      const completedAt = task.isCompletedToday ? null : new Date().toISOString();
      await this.repo.update(task.id, { completedAt });
    }
  }
}
