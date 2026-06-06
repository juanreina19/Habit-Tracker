import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { UUID } from "@/shared/types/database.types";
import type { Task, UpdateTaskInput } from "../entities/Task";

export class UpdateTaskUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(id: UUID, input: UpdateTaskInput): Promise<Task> {
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) throw new Error("Task title cannot be empty");
      input = { ...input, title: trimmed };
    }
    return this.repo.update(id, input);
  }
}
