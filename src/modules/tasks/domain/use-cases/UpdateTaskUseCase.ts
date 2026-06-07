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

    if (input.endTime && input.startTime && input.endTime <= input.startTime) {
      throw new Error("End time must be after start time");
    }

    // Normalizar recurrenceDays
    if ("recurrenceDays" in input) {
      const days = input.recurrenceDays;
      const normalized = days?.length ? days : null;
      input = {
        ...input,
        recurrenceDays: normalized,
        // Si se activa recurrencia: limpiar due_date y completed_at
        ...(normalized ? { dueDate: null, completedAt: null } : {}),
      };
    }

    return this.repo.update(id, input);
  }
}
