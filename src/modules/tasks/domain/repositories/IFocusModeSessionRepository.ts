import type { FocusModeSession } from "../entities/FocusModeSession";
import type { UUID } from "@/shared/types/database.types";

export interface IFocusModeSessionRepository {
  /** Sesión activa del usuario, o null si no hay ninguna. */
  get(userId: UUID): Promise<FocusModeSession | null>;

  /**
   * Crea la sesión activa. Si ya existe una (carrera entre dispositivos),
   * devuelve la sesión existente en su lugar.
   */
  start(userId: UUID, session: FocusModeSession): Promise<FocusModeSession>;

  /** Actualiza campos de la sesión activa (pausa, reanudación, avance de fase, ajustes en vivo). */
  update(
    userId: UUID,
    patch: Partial<Pick<FocusModeSession,
      "taskIds" | "startedAt" | "pausedAt" | "accumulatedSec" |
      "phase" | "sessionIndex" | "durationMin" |
      "focusDurationMin" | "shortBreakMin" | "longBreakMin" | "longBreakInterval" |
      "autoStartShortBreak" | "autoStartLongBreak"
    >>
  ): Promise<void>;

  /** Elimina la sesión activa (salir del Focus Mode). */
  clear(userId: UUID): Promise<void>;
}
