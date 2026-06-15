import type { ISubtaskRepository } from "../repositories/ISubtaskRepository";
import type { Subtask, CreateSubtaskInput } from "../entities/Subtask";
import type { UUID } from "@/shared/types/database.types";

export class CreateSubtaskUseCase {
  constructor(private readonly repo: ISubtaskRepository) {}

  async execute(userId: UUID, taskId: UUID, input: CreateSubtaskInput): Promise<Subtask> {
    const trimmed = input.title.trim();
    if (!trimmed) throw new Error("Subtask title cannot be empty");
    return this.repo.create(userId, taskId, { title: trimmed });
  }
}
