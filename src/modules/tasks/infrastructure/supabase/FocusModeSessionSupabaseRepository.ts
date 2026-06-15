import type { SupabaseClient } from "@supabase/supabase-js";
import type { IFocusModeSessionRepository } from "../../domain/repositories/IFocusModeSessionRepository";
import type { FocusModeSession } from "../../domain/entities/FocusModeSession";
import { normalizePhase } from "../../domain/entities/FocusModeSession";
import type { UUID, DbFocusModeSession } from "@/shared/types/database.types";

/** Código de Postgres para violación de constraint UNIQUE/PK. */
const UNIQUE_VIOLATION = "23505";

export class FocusModeSessionSupabaseRepository implements IFocusModeSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: DbFocusModeSession): FocusModeSession {
    return {
      userId:              row.user_id,
      clientSessionId:     row.client_session_id,
      taskIds:             row.task_ids ?? [],
      phase:               normalizePhase(row.phase),
      sessionIndex:        row.session_index ?? 1,
      focusDurationMin:    row.focus_duration_min,
      shortBreakMin:       row.short_break_min,
      longBreakMin:        row.long_break_min,
      longBreakInterval:   row.long_break_interval,
      autoStartShortBreak: row.auto_start_short_break,
      autoStartLongBreak:  row.auto_start_long_break,
      durationMin:         row.duration_min,
      startedAt:           row.started_at,
      pausedAt:            row.paused_at,
      accumulatedSec:      row.accumulated_sec,
    };
  }

  async get(userId: UUID): Promise<FocusModeSession | null> {
    const { data, error } = await this.client
      .from("focus_mode_sessions")
      .select()
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToEntity(data as DbFocusModeSession) : null;
  }

  async start(userId: UUID, session: FocusModeSession): Promise<FocusModeSession> {
    const { data, error } = await this.client
      .from("focus_mode_sessions")
      .insert({
        user_id:                userId,
        client_session_id:     session.clientSessionId,
        task_ids:               session.taskIds,
        phase:                  session.phase,
        session_index:          session.sessionIndex,
        focus_duration_min:     session.focusDurationMin,
        short_break_min:        session.shortBreakMin,
        long_break_min:         session.longBreakMin,
        long_break_interval:    session.longBreakInterval,
        auto_start_short_break: session.autoStartShortBreak,
        auto_start_long_break:  session.autoStartLongBreak,
        duration_min:           session.durationMin,
        started_at:             session.startedAt,
        paused_at:              session.pausedAt,
        accumulated_sec:        session.accumulatedSec,
        updated_at:             new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        // Otro dispositivo ganó la carrera: adoptamos su sesión activa.
        const existing = await this.get(userId);
        if (existing) return existing;
      }
      throw error;
    }

    return this.mapToEntity(data as DbFocusModeSession);
  }

  async update(
    userId: UUID,
    patch: Partial<Pick<FocusModeSession,
      "taskIds" | "startedAt" | "pausedAt" | "accumulatedSec" |
      "phase" | "sessionIndex" | "durationMin" |
      "focusDurationMin" | "shortBreakMin" | "longBreakMin" | "longBreakInterval" |
      "autoStartShortBreak" | "autoStartLongBreak"
    >>
  ): Promise<void> {
    const update: Partial<DbFocusModeSession> = { updated_at: new Date().toISOString() };
    if (patch.taskIds !== undefined) update.task_ids = patch.taskIds;
    if (patch.startedAt !== undefined) update.started_at = patch.startedAt;
    if (patch.pausedAt !== undefined) update.paused_at = patch.pausedAt;
    if (patch.accumulatedSec !== undefined) update.accumulated_sec = patch.accumulatedSec;
    if (patch.phase !== undefined) update.phase = patch.phase;
    if (patch.sessionIndex !== undefined) update.session_index = patch.sessionIndex;
    if (patch.durationMin !== undefined) update.duration_min = patch.durationMin;
    if (patch.focusDurationMin !== undefined) update.focus_duration_min = patch.focusDurationMin;
    if (patch.shortBreakMin !== undefined) update.short_break_min = patch.shortBreakMin;
    if (patch.longBreakMin !== undefined) update.long_break_min = patch.longBreakMin;
    if (patch.longBreakInterval !== undefined) update.long_break_interval = patch.longBreakInterval;
    if (patch.autoStartShortBreak !== undefined) update.auto_start_short_break = patch.autoStartShortBreak;
    if (patch.autoStartLongBreak !== undefined) update.auto_start_long_break = patch.autoStartLongBreak;

    const { error } = await this.client
      .from("focus_mode_sessions")
      .update(update)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async clear(userId: UUID): Promise<void> {
    const { error } = await this.client
      .from("focus_mode_sessions")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }
}
