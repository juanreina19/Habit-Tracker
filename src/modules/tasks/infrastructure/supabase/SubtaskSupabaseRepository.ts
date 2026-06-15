import type { SupabaseClient } from "@supabase/supabase-js";
import type { ISubtaskRepository } from "../../domain/repositories/ISubtaskRepository";
import type { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from "../../domain/entities/Subtask";
import type { UUID, DbSubtask } from "@/shared/types/database.types";

export class SubtaskSupabaseRepository implements ISubtaskRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: DbSubtask): Subtask {
    return {
      id:          row.id,
      taskId:      row.task_id,
      userId:      row.user_id,
      title:       row.title,
      isCompleted: row.is_completed,
      order:       row.order,
      createdAt:   row.created_at,
    };
  }

  async listByTask(taskId: UUID): Promise<Subtask[]> {
    const { data, error } = await this.client
      .from("subtasks")
      .select("*")
      .eq("task_id", taskId)
      .order("order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as DbSubtask[]).map((r) => this.mapToEntity(r));
  }

  async create(userId: UUID, taskId: UUID, input: CreateSubtaskInput): Promise<Subtask> {
    const { data, error } = await this.client
      .from("subtasks")
      .insert({
        task_id:      taskId,
        user_id:      userId,
        title:        input.title.trim(),
        is_completed: false,
        order:        0,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbSubtask);
  }

  async update(id: UUID, input: UpdateSubtaskInput): Promise<Subtask> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined)       patch.title = input.title.trim();
    if (input.isCompleted !== undefined) patch.is_completed = input.isCompleted;
    if (input.order !== undefined)       patch.order = input.order;

    const { data, error } = await this.client
      .from("subtasks")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbSubtask);
  }

  async delete(id: UUID): Promise<void> {
    const { error } = await this.client
      .from("subtasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async countByTasks(taskIds: UUID[]): Promise<Map<UUID, { total: number; completed: number }>> {
    const counts = new Map<UUID, { total: number; completed: number }>();
    if (taskIds.length === 0) return counts;

    const { data, error } = await this.client.rpc("count_subtasks_by_task", { p_task_ids: taskIds });
    if (error) throw error;

    for (const row of data ?? []) {
      counts.set(row.task_id, { total: Number(row.total), completed: Number(row.completed) });
    }
    return counts;
  }
}
