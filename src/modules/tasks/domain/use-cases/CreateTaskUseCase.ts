import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { UUID } from "@/shared/types/database.types";
import type { Task, CreateTaskInput } from "../entities/Task";
import { today } from "@/shared/lib/utils/dates";

export class CreateTaskUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(userId: UUID, input: CreateTaskInput): Promise<Task> {
    const trimmed = input.title.trim();
    if (!trimmed) throw new Error("Task title cannot be empty");

    if (input.endTime && input.startTime && input.endTime <= input.startTime) {
      throw new Error("End time must be after start time");
    }

    // Normalizar: array vacío = tarea única
    const recurrenceDays = input.recurrenceDays?.length ? input.recurrenceDays : undefined;

    // Si es recurrente, due_date no aplica
    const dueDate = recurrenceDays ? undefined : input.dueDate;

    // Una tarea única no puede nacer ya vencida (solo aplica a creación, nunca a edición)
    if (dueDate && dueDate < today()) {
      throw new Error("Due date cannot be in the past");
    }

    return this.repo.create(userId, { ...input, title: trimmed, recurrenceDays, dueDate });
  }
}
