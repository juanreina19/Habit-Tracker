import type { UUID, ISODate } from "@/shared/types/database.types";
import type { Task, TaskWithStatus, CreateTaskInput, UpdateTaskInput } from "../entities/Task";

export interface ITaskRepository {
  /**
   * Todas las tareas del usuario enriquecidas con isCompletedToday.
   * Tareas únicas: isCompletedToday = completedAt !== null
   * Tareas recurrentes: isCompletedToday = existe completion para `today`
   */
  findAllByUser(userId: UUID, today: ISODate): Promise<TaskWithStatus[]>;

  /**
   * Tareas que aplican hoy:
   *   - Recurrentes: recurrence_days contiene el día de la semana de hoy
   *   - Únicas atrasadas: due_date < hoy AND completed_at IS NULL
   *   - Únicas de hoy: due_date = hoy
   *   - Únicas sin fecha: due_date IS NULL AND completed_at IS NULL
   * Filtrado delegado a SQL. Orden: priority ASC (urgent=0), created_at ASC.
   */
  findForToday(userId: UUID, today: ISODate): Promise<TaskWithStatus[]>;

  create(userId: UUID, input: CreateTaskInput): Promise<Task>;
  update(id: UUID, input: UpdateTaskInput): Promise<Task>;
  /** Hard delete. task_completions se borran por CASCADE. */
  delete(id: UUID): Promise<void>;

  /** Marca tarea recurrente como completada en la fecha dada (upsert). */
  addCompletion(taskId: UUID, userId: UUID, date: ISODate): Promise<void>;
  /** Elimina la completación de una tarea recurrente para la fecha dada. */
  removeCompletion(taskId: UUID, userId: UUID, date: ISODate): Promise<void>;
}
