import type { SupabaseClient } from "@supabase/supabase-js";
import type { IActiveFocusSessionRepository } from "../../domain/repositories/IActiveFocusSessionRepository";
import type { ActiveFocusSession } from "../../domain/entities/ActiveFocusSession";
import { normalizePhase } from "../../domain/entities/ActiveFocusSession";
import {
  DEFAULT_SESSIONS_GOAL,
  DEFAULT_SHORT_BREAK_MIN,
  DEFAULT_LONG_BREAK_MIN,
  DEFAULT_LONG_BREAK_INTERVAL,
  DEFAULT_AUTO_START_SHORT_BREAK,
  DEFAULT_AUTO_START_LONG_BREAK,
} from "../../domain/entities/Task";
import type { UUID, DbActiveFocusSession } from "@/shared/types/database.types";

/** Código de Postgres para violación de constraint UNIQUE/PK. */
const UNIQUE_VIOLATION = "23505";

export class ActiveFocusSessionSupabaseRepository implements IActiveFocusSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: DbActiveFocusSession): ActiveFocusSession {
    return {
      userId:            row.user_id,
      clientSessionId:   row.client_session_id,
      taskId:            row.task_id,
      taskTitle:         row.task_title,
      durationMin:       row.duration_min,
      startedAt:         row.started_at,
      pausedAt:          row.paused_at,
      accumulatedSec:    row.accumulated_sec,
      continuedPastGoal: row.continued_past_goal,
      phase:             normalizePhase(row.phase),
      sessionIndex:      row.session_index ?? 1,
      sessionsGoal:      row.sessions_goal ?? DEFAULT_SESSIONS_GOAL,
      shortBreakMin:     row.short_break_min ?? DEFAULT_SHORT_BREAK_MIN,
      longBreakMin:      row.long_break_min ?? DEFAULT_LONG_BREAK_MIN,
      longBreakInterval: row.long_break_interval ?? DEFAULT_LONG_BREAK_INTERVAL,
      autoStartShortBreak: row.auto_start_short_break ?? DEFAULT_AUTO_START_SHORT_BREAK,
      autoStartLongBreak:  row.auto_start_long_break ?? DEFAULT_AUTO_START_LONG_BREAK,
      focusDurationMin:  row.focus_duration_min ?? row.duration_min,
    };
  }

  async get(userId: UUID): Promise<ActiveFocusSession | null> {
    const { data, error } = await this.client
      .from("active_focus_sessions")
      .select()
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToEntity(data as DbActiveFocusSession) : null;
  }

  async start(userId: UUID, session: ActiveFocusSession): Promise<ActiveFocusSession> {
    const { data, error } = await this.client
      .from("active_focus_sessions")
      .insert({
        user_id:             userId,
        client_session_id:   session.clientSessionId,
        task_id:             session.taskId,
        task_title:          session.taskTitle,
        duration_min:        session.durationMin,
        started_at:          session.startedAt,
        paused_at:           session.pausedAt,
        accumulated_sec:     session.accumulatedSec,
        continued_past_goal: session.continuedPastGoal,
        phase:               session.phase,
        session_index:       session.sessionIndex,
        sessions_goal:       session.sessionsGoal,
        short_break_min:     session.shortBreakMin,
        long_break_min:      session.longBreakMin,
        long_break_interval: session.longBreakInterval,
        auto_start_short_break: session.autoStartShortBreak,
        auto_start_long_break:  session.autoStartLongBreak,
        focus_duration_min:  session.focusDurationMin,
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

    return this.mapToEntity(data as DbActiveFocusSession);
  }

  async update(
    userId: UUID,
    patch: Partial<Pick<ActiveFocusSession,
      "startedAt" | "pausedAt" | "accumulatedSec" | "continuedPastGoal" |
      "phase" | "sessionIndex" | "durationMin" |
      "sessionsGoal" | "shortBreakMin" | "longBreakMin" | "longBreakInterval" |
      "autoStartShortBreak" | "autoStartLongBreak"
    >>
  ): Promise<void> {
    const update: Partial<DbActiveFocusSession> = { updated_at: new Date().toISOString() };
    if (patch.startedAt !== undefined) update.started_at = patch.startedAt;
    if (patch.pausedAt !== undefined) update.paused_at = patch.pausedAt;
    if (patch.accumulatedSec !== undefined) update.accumulated_sec = patch.accumulatedSec;
    if (patch.continuedPastGoal !== undefined) update.continued_past_goal = patch.continuedPastGoal;
    if (patch.phase !== undefined) update.phase = patch.phase;
    if (patch.sessionIndex !== undefined) update.session_index = patch.sessionIndex;
    if (patch.durationMin !== undefined) update.duration_min = patch.durationMin;
    if (patch.sessionsGoal !== undefined) update.sessions_goal = patch.sessionsGoal;
    if (patch.shortBreakMin !== undefined) update.short_break_min = patch.shortBreakMin;
    if (patch.longBreakMin !== undefined) update.long_break_min = patch.longBreakMin;
    if (patch.longBreakInterval !== undefined) update.long_break_interval = patch.longBreakInterval;
    if (patch.autoStartShortBreak !== undefined) update.auto_start_short_break = patch.autoStartShortBreak;
    if (patch.autoStartLongBreak !== undefined) update.auto_start_long_break = patch.autoStartLongBreak;

    const { error } = await this.client
      .from("active_focus_sessions")
      .update(update)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async clear(userId: UUID): Promise<void> {
    const { error } = await this.client
      .from("active_focus_sessions")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }
}
