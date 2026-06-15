import type { ISubtaskRepository } from "../repositories/ISubtaskRepository";
import type { UUID } from "@/shared/types/database.types";

export class DeleteSubtaskUseCase {
  constructor(private readonly repo: ISubtaskRepository) {}

  async execute(id: UUID): Promise<void> {
    return this.repo.delete(id);
  }
}
