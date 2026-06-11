import type { ActiveFocusSession } from "../entities/ActiveFocusSession";
import type { UUID } from "@/shared/types/database.types";

export interface IActiveFocusSessionRepository {
  /** Sesión activa del usuario, o null si no hay ninguna. */
  get(userId: UUID): Promise<ActiveFocusSession | null>;

  /**
   * Crea la sesión activa. Si ya existe una (carrera entre dispositivos),
   * devuelve la sesión existente en su lugar.
   */
  start(userId: UUID, session: ActiveFocusSession): Promise<ActiveFocusSession>;

  /** Actualiza campos de la sesión activa (pausa, reanudación, continuar). */
  update(
    userId: UUID,
    patch: Partial<Pick<ActiveFocusSession, "startedAt" | "pausedAt" | "accumulatedSec" | "continuedPastGoal">>
  ): Promise<void>;

  /** Elimina la sesión activa (finalizar o descartar). */
  clear(userId: UUID): Promise<void>;
}
