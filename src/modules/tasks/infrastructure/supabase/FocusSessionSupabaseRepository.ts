import type { SupabaseClient } from "@supabase/supabase-js";
import type { IFocusSessionRepository } from "../../domain/repositories/IFocusSessionRepository";
import type { FocusSession, CreateFocusSessionInput } from "../../domain/entities/FocusSession";
import type { UUID, ISOTimestamp, DbFocusSession } from "@/shared/types/database.types";

export class FocusSessionSupabaseRepository implements IFocusSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: DbFocusSession): FocusSession {
    return {
      id:          row.id,
      userId:      row.user_id,
      taskId:      row.task_id,
      durationMin: row.duration_min,
      startedAt:   row.started_at,
      endedAt:     row.ended_at,
      elapsedSec:  row.elapsed_sec,
      status:      row.status,
      createdAt:   row.created_at,
    };
  }

  async create(userId: UUID, input: CreateFocusSessionInput): Promise<FocusSession> {
    const { data, error } = await this.client
      .from("focus_sessions")
      .insert({
        task_id:      input.taskId,
        user_id:      userId,
        duration_min: input.durationMin,
        started_at:   input.startedAt,
        ended_at:     input.endedAt,
        elapsed_sec:  input.elapsedSec,
        status:       input.status,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbFocusSession);
  }

  async countByTask(taskIds: UUID[], since: ISOTimestamp): Promise<Map<UUID, number>> {
    if (taskIds.length === 0) return new Map();

    const { data, error } = await this.client.rpc("count_focus_sessions_by_task", {
      p_task_ids: taskIds,
      p_since: since,
    });
    if (error) throw error;

    return new Map((data ?? []).map((row: { task_id: UUID; total: number }) => [row.task_id, Number(row.total)]));
  }
}
