import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { UUID } from "@/shared/types/database.types";
import type { Task, CreateTaskInput } from "../entities/Task";

export class CreateTaskUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(userId: UUID, input: CreateTaskInput): Promise<Task> {
    const trimmed = input.title.trim();
    if (!trimmed) throw new Error("Task title cannot be empty");
    return this.repo.create(userId, { ...input, title: trimmed });
  }
}
