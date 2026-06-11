import type { UUID, ISOTimestamp } from "@/shared/types/database.types";
import type { FocusSession, CreateFocusSessionInput } from "../entities/FocusSession";

export interface IFocusSessionRepository {
  /** Persiste una sesión finalizada (completa o abandonada). */
  create(userId: UUID, input: CreateFocusSessionInput): Promise<FocusSession>;

  /**
   * Map<taskId, número de sesiones con status='completed' y ended_at >= since>.
   * `since` = inicio del día actual (hora local) — el badge "🍅 N" representa
   * sesiones de HOY, no el total histórico. Las abandonadas no cuentan (quedan
   * disponibles para estadísticas futuras). Tareas sin sesiones completadas hoy
   * no aparecen (usar ?? 0).
   */
  countByTask(taskIds: UUID[], since: ISOTimestamp): Promise<Map<UUID, number>>;
}
