import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { UUID } from "@/shared/types/database.types";

export class DeleteTaskUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(id: UUID): Promise<void> {
    return this.repo.delete(id);
  }
}
