import { today } from "@/shared/lib/utils/dates";
import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { Task, UpdateTaskInput } from "../entities/Task";

export class UpdateTaskUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(task: Task, input: UpdateTaskInput): Promise<Task> {
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

    // Rechaza solo un CAMBIO ACTIVO de dueDate hacia el pasado — cubre tanto mover una
    // fecha existente ("2026-06-20" → "2026-06-01") como asignar una fecha pasada a una
    // tarea que antes no tenía (null → "2026-06-01"; null !== "..." también dispara).
    // Jamás bloquea guardar una tarea YA vencida sin tocar su fecha (edición = informativa).
    // today() acota por arriba a createdAt (una tarea nunca nace en el futuro), así que
    // esta única comparación ya garantiza dueDate >= max(createdAt, today) de forma transitiva.
    if (input.dueDate && input.dueDate !== task.dueDate && input.dueDate < today()) {
      throw new Error("Due date cannot be set to a past date");
    }

    return this.repo.update(task.id, input);
  }
}
