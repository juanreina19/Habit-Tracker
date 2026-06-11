import type { SupabaseClient } from "@supabase/supabase-js";
import type { IActiveFocusSessionRepository } from "../../domain/repositories/IActiveFocusSessionRepository";
import type { ActiveFocusSession } from "../../domain/entities/ActiveFocusSession";
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
    patch: Partial<Pick<ActiveFocusSession, "startedAt" | "pausedAt" | "accumulatedSec" | "continuedPastGoal">>
  ): Promise<void> {
    const update: Partial<DbActiveFocusSession> = { updated_at: new Date().toISOString() };
    if (patch.startedAt !== undefined) update.started_at = patch.startedAt;
    if (patch.pausedAt !== undefined) update.paused_at = patch.pausedAt;
    if (patch.accumulatedSec !== undefined) update.accumulated_sec = patch.accumulatedSec;
    if (patch.continuedPastGoal !== undefined) update.continued_past_goal = patch.continuedPastGoal;

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
