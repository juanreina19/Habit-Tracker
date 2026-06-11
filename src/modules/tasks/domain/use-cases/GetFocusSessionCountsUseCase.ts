import type { IFocusSessionRepository } from "../repositories/IFocusSessionRepository";
import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export class GetFocusSessionCountsUseCase {
  constructor(private readonly repo: IFocusSessionRepository) {}

  /**
   * Map<taskId, número de sesiones COMPLETADAS con ended_at >= since>.
   * El badge "🍅 N" usa `since` = inicio del día actual (hora local), por lo
   * que N representa sesiones completadas HOY, no el total histórico. Las
   * abandonadas no cuentan. Tareas sin sesiones completadas hoy no aparecen.
   */
  async execute(taskIds: UUID[], since: ISOTimestamp): Promise<Map<UUID, number>> {
    if (taskIds.length === 0) return new Map();
    return this.repo.countByTask(taskIds, since);
  }
}
