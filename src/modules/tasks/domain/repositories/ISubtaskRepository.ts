import type { UUID } from "@/shared/types/database.types";
import type { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from "../entities/Subtask";

export interface ISubtaskRepository {
  /** Subtareas de una tarea, ordenadas por `order` ascendente. */
  listByTask(taskId: UUID): Promise<Subtask[]>;

  create(userId: UUID, taskId: UUID, input: CreateSubtaskInput): Promise<Subtask>;
  update(id: UUID, input: UpdateSubtaskInput): Promise<Subtask>;
  delete(id: UUID): Promise<void>;

  /**
   * Conteo total/completadas por tarea, para los badges "✓N/M" en /tasks.
   * Devuelve un Map sin entrada para las tareas sin subtareas.
   */
  countByTasks(taskIds: UUID[]): Promise<Map<UUID, { total: number; completed: number }>>;
}
