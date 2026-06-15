import type { ISubtaskRepository } from "../repositories/ISubtaskRepository";
import type { Subtask } from "../entities/Subtask";
import type { UUID } from "@/shared/types/database.types";

export class ListSubtasksUseCase {
  constructor(private readonly repo: ISubtaskRepository) {}

  async execute(taskId: UUID): Promise<Subtask[]> {
    return this.repo.listByTask(taskId);
  }
}
