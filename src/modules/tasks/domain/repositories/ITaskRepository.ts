import type { UUID } from "@/shared/types/database.types";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../entities/Task";

export interface ITaskRepository {
  /**
   * Todas las tareas del usuario.
   * Orden: completedAt IS NULL (pendientes) primero → completed_at DESC (completadas).
   * El componente TasksView aplica orden secundario dentro del grupo de pendientes.
   */
  findAllByUser(userId: UUID): Promise<Task[]>;

  /**
   * Tareas para Today view. Orden: priority DESC, created_at ASC.
   *   - vencidas:   due_date < hoy AND completed_at IS NULL
   *   - de hoy:     due_date = hoy  (independientemente de completed_at)
   *   - sin fecha:  due_date IS NULL AND completed_at IS NULL
   */
  findForToday(userId: UUID): Promise<Task[]>;

  create(userId: UUID, input: CreateTaskInput): Promise<Task>;
  update(id: UUID, input: UpdateTaskInput): Promise<Task>;
  /** Hard delete */
  delete(id: UUID): Promise<void>;
}
