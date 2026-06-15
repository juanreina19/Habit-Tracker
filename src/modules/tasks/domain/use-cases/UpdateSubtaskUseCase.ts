import type { ISubtaskRepository } from "../repositories/ISubtaskRepository";
import type { Subtask, UpdateSubtaskInput } from "../entities/Subtask";
import type { UUID } from "@/shared/types/database.types";

export class UpdateSubtaskUseCase {
  constructor(private readonly repo: ISubtaskRepository) {}

  async execute(id: UUID, input: UpdateSubtaskInput): Promise<Subtask> {
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) throw new Error("Subtask title cannot be empty");
      input = { ...input, title: trimmed };
    }
    return this.repo.update(id, input);
  }
}
