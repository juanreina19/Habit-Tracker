import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import type { Task, TaskWithStatus, CreateTaskInput, UpdateTaskInput } from "../../domain/entities/Task";
import type { UUID, ISODate, DbTask } from "@/shared/types/database.types";
import { dayOfWeek } from "@/shared/lib/utils/dates";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export class TaskSupabaseRepository implements ITaskRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: DbTask): Task {
    return {
      id:             row.id,
      userId:         row.user_id,
      categoryId:     row.category_id ?? null,
      title:          row.title,
      description:    row.description,
      priority:       row.priority,
      dueDate:        row.due_date,
      recurrenceDays: row.recurrence_days ?? null,
      startTime:      row.start_time ?? null,
      endTime:        row.end_time ?? null,
      completedAt:    row.completed_at,
      createdAt:      row.created_at,
      icon:           row.icon ?? null,
    };
  }

  async findAllByUser(userId: UUID, today: ISODate): Promise<TaskWithStatus[]> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const tasks = (data ?? []) as DbTask[];
    const recurringIds = tasks
      .filter(t => t.recurrence_days?.length)
      .map(t => t.id);

    let completedToday = new Set<UUID>();
    if (recurringIds.length > 0) {
      const { data: completions, error: compError } = await this.client
        .from("task_completions")
        .select("task_id")
        .eq("user_id", userId)
        .eq("completed_date", today)
        .in("task_id", recurringIds);
      if (compError) throw compError;
      completedToday = new Set((completions ?? []).map(c => c.task_id as UUID));
    }

    return tasks.map(r => ({
      ...this.mapToEntity(r),
      isCompletedToday: r.recurrence_days?.length
        ? completedToday.has(r.id)
        : r.completed_at !== null,
    }));
  }

  async findForToday(userId: UUID, today: ISODate): Promise<TaskWithStatus[]> {
    const todayDate = new Date(today + "T12:00:00");
    const dow = dayOfWeek(todayDate);

    // Dos queries en paralelo — filtrado delegado a SQL
    const [oneTimeResult, recurringResult] = await Promise.all([
      this.client
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .is("recurrence_days", null)
        .or(
          `and(due_date.lt.${today},completed_at.is.null),` +
          `due_date.eq.${today},` +
          `and(due_date.is.null,completed_at.is.null)`
        ),
      this.client
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .contains("recurrence_days", [dow]),
    ]);

    if (oneTimeResult.error) throw oneTimeResult.error;
    if (recurringResult.error) throw recurringResult.error;

    const recurring = (recurringResult.data ?? []) as DbTask[];

    let completedToday = new Set<UUID>();
    if (recurring.length > 0) {
      const { data: completions, error: compError } = await this.client
        .from("task_completions")
        .select("task_id")
        .eq("user_id", userId)
        .eq("completed_date", today)
        .in("task_id", recurring.map(t => t.id));
      if (compError) throw compError;
      completedToday = new Set((completions ?? []).map(c => c.task_id as UUID));
    }

    const oneTimeTasks: TaskWithStatus[] = ((oneTimeResult.data ?? []) as DbTask[]).map(r => ({
      ...this.mapToEntity(r),
      isCompletedToday: r.completed_at !== null,
    }));

    const recurringTasks: TaskWithStatus[] = recurring.map(r => ({
      ...this.mapToEntity(r),
      isCompletedToday: completedToday.has(r.id),
    }));

    return [...oneTimeTasks, ...recurringTasks].sort((a, b) => {
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  async create(userId: UUID, input: CreateTaskInput): Promise<Task> {
    const { data, error } = await this.client
      .from("tasks")
      .insert({
        user_id:         userId,
        category_id:     input.categoryId ?? null,
        title:           input.title.trim(),
        description:     input.description ?? null,
        priority:        input.priority ?? "medium",
        due_date:        input.dueDate ?? null,
        recurrence_days: input.recurrenceDays?.length ? input.recurrenceDays : null,
        start_time:      input.startTime ?? null,
        end_time:        input.endTime ?? null,
        completed_at:    null,
        icon:            input.icon ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbTask);
  }

  async update(id: UUID, input: UpdateTaskInput): Promise<Task> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined)             patch.title = input.title.trim();
    if (input.description !== undefined)       patch.description = input.description;
    if (input.priority !== undefined)          patch.priority = input.priority;
    if ("dueDate" in input)                    patch.due_date = input.dueDate ?? null;
    if ("completedAt" in input)                patch.completed_at = input.completedAt ?? null;
    if ("recurrenceDays" in input)             patch.recurrence_days = input.recurrenceDays ?? null;
    if ("startTime" in input)                  patch.start_time = input.startTime ?? null;
    if ("endTime" in input)                    patch.end_time = input.endTime ?? null;
    if ("icon" in input)                       patch.icon = input.icon ?? null;
    if ("categoryId" in input)                patch.category_id = input.categoryId ?? null;

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

  async addCompletion(taskId: UUID, userId: UUID, date: ISODate): Promise<void> {
    const { error } = await this.client
      .from("task_completions")
      .upsert({ task_id: taskId, user_id: userId, completed_date: date });
    if (error) throw error;
  }

  async removeCompletion(taskId: UUID, userId: UUID, date: ISODate): Promise<void> {
    const { error } = await this.client
      .from("task_completions")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", userId)
      .eq("completed_date", date);
    if (error) throw error;
  }

  async findCompletionsInRange(userId: UUID, startDate: ISODate, endDate: ISODate): Promise<Set<string>> {
    const { data, error } = await this.client
      .from("task_completions")
      .select("task_id, completed_date")
      .eq("user_id", userId)
      .gte("completed_date", startDate)
      .lte("completed_date", endDate);
    if (error) throw error;
    return new Set((data ?? []).map((r) => `${r.task_id}:${r.completed_date}`));
  }
}
