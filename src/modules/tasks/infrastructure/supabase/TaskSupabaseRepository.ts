import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../../domain/entities/Task";
import type { UUID, DbTask } from "@/shared/types/database.types";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export class TaskSupabaseRepository implements ITaskRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: DbTask): Task {
    return {
      id:          row.id,
      userId:      row.user_id,
      title:       row.title,
      description: row.description,
      priority:    row.priority,
      dueDate:     row.due_date,
      completedAt: row.completed_at,
      createdAt:   row.created_at,
    };
  }

  async findAllByUser(userId: UUID): Promise<Task[]> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((r) => this.mapToEntity(r as DbTask));
  }

  async findForToday(userId: UUID): Promise<Task[]> {
    const todayISO = format(new Date(), "yyyy-MM-dd");

    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .or(
        `and(due_date.lt.${todayISO},completed_at.is.null),` +
        `due_date.eq.${todayISO},` +
        `and(due_date.is.null,completed_at.is.null)`
      );

    if (error) throw error;

    return (data ?? [])
      .map((r) => this.mapToEntity(r as DbTask))
      .sort((a, b) => {
        const pDiff = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
        if (pDiff !== 0) return pDiff;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }

  async create(userId: UUID, input: CreateTaskInput): Promise<Task> {
    const { data, error } = await this.client
      .from("tasks")
      .insert({
        user_id:     userId,
        title:       input.title.trim(),
        description: input.description ?? null,
        priority:    input.priority ?? "medium",
        due_date:    input.dueDate ?? null,
        completed_at: null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbTask);
  }

  async update(id: UUID, input: UpdateTaskInput): Promise<Task> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined)       patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.priority !== undefined)    patch.priority = input.priority;
    if ("dueDate" in input)              patch.due_date = input.dueDate ?? null;
    if ("completedAt" in input)          patch.completed_at = input.completedAt ?? null;

    const { data, error } = await this.client
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbTask);
  }

  async delete(id: UUID): Promise<void> {
    const { error } = await this.client
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
