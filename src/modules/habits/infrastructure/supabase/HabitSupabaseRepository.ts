import type { SupabaseClient } from "@supabase/supabase-js";
import type { UUID, ISODate, DbHabit, DbHabitLog, DbStreak } from "@/shared/types/database.types";
import type { IHabitRepository, CreateHabitInput, UpdateHabitInput } from "../../domain/repositories/IHabitRepository";
import type { Habit, HabitLog, HabitWithStatus, Streak } from "../../domain/entities/Habit";
import { isHabitActiveOnDay } from "@/shared/lib/utils/dates";

function mapDbToHabit(row: DbHabit): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    activeDays: row.active_days,
    estimatedMinutes: row.estimated_minutes,
    startTime: row.start_time,
    order: row.order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapDbToStreak(row: DbStreak): Streak {
  return {
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    lastCompletedAt: row.last_completed_at,
    freezeUsedAt: row.freeze_used_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class HabitSupabaseRepository implements IHabitRepository {
  constructor(private readonly client: SupabaseClient<any>) {}

  async findAllByUser(userId: UUID): Promise<Habit[]> {
    const { data, error } = await this.client
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("order", { ascending: true });

    if (error) throw error;
    return data.map(mapDbToHabit);
  }

  async findActiveForDate(userId: UUID, date: ISODate): Promise<HabitWithStatus[]> {
    const dayDate = new Date(date + "T12:00:00"); // Evitar timezone issues

    // [HT] LOG — valores exactos usados en la consulta
    console.log(
      `[HT REPO:findActiveForDate] ${Date.now()} date="${date}" dayDate="${dayDate.toISOString()}" dayOfWeek=${dayDate.getDay()} localTZ=${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    );

    const [habitsResult, logsResult, streaksResult] = await Promise.all([
      this.client.from("habits").select("*").eq("user_id", userId).eq("is_active", true).order("order"),
      this.client.from("habit_logs").select("*").eq("user_id", userId).eq("completed_at", date),
      this.client.from("streaks").select("*").eq("user_id", userId),
    ]);

    if (habitsResult.error) throw habitsResult.error;
    if (logsResult.error) throw logsResult.error;
    if (streaksResult.error) throw streaksResult.error;

    // [HT] LOG — qué logs devolvió la DB para esta fecha
    console.log(
      `[HT REPO:findActiveForDate] logs found=${logsResult.data.length} for completed_at="${date}":`,
      logsResult.data.map((l) => `habit=${l.habit_id.slice(0, 6)} completed_at=${l.completed_at}`)
    );

    const logHabitIds = new Set(logsResult.data.map((l) => l.habit_id));
    const streakMap = new Map(streaksResult.data.map((s) => [s.habit_id, mapDbToStreak(s)]));

    const filtered = habitsResult.data.filter((h) => isHabitActiveOnDay(h.active_days, dayDate));

    // [HT] LOG — qué hábitos pasan el filtro de día activo
    console.log(
      `[HT REPO:findActiveForDate] habits total=${habitsResult.data.length} after_day_filter=${filtered.length}`,
      filtered.map((h) => `${h.id.slice(0, 6)} activeDays=[${h.active_days}] completed=${logHabitIds.has(h.id) ? "✓" : "✗"}`)
    );

    return filtered.map((h) => ({
      ...mapDbToHabit(h),
      streak: streakMap.get(h.id) ?? null,
      isCompletedToday: logHabitIds.has(h.id),
    }));
  }

  async findById(id: UUID): Promise<Habit | null> {
    const { data, error } = await this.client.from("habits").select("*").eq("id", id).single();
    if (error) return null;
    return mapDbToHabit(data);
  }

  async create(userId: UUID, input: CreateHabitInput): Promise<Habit> {
    const { count } = await this.client.from("habits").select("id", { count: "exact", head: true }).eq("user_id", userId);
    
    const { data, error } = await this.client
      .from("habits")
      .insert({
        user_id: userId,
        category_id: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        color: input.color ?? null,
        active_days: input.activeDays,
        estimated_minutes: input.estimatedMinutes ?? null,
        start_time: input.startTime ?? null,
        order: count ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return mapDbToHabit(data);
  }

  async update(id: UUID, input: UpdateHabitInput): Promise<Habit> {
    const { data, error } = await this.client
      .from("habits")
      .update({
        ...(input.categoryId !== undefined && { category_id: input.categoryId }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.activeDays !== undefined && { active_days: input.activeDays }),
        ...(input.estimatedMinutes !== undefined && { estimated_minutes: input.estimatedMinutes }),
        ...(input.startTime !== undefined && { start_time: input.startTime }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.isActive !== undefined && { is_active: input.isActive }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapDbToHabit(data);
  }

  async deactivate(id: UUID): Promise<void> {
    const { error } = await this.client.from("habits").update({ is_active: false }).eq("id", id);
    if (error) throw error;
  }

  async reorder(habitIds: UUID[]): Promise<void> {
    const updates = habitIds.map((id, index) =>
      this.client.from("habits").update({ order: index }).eq("id", id)
    );
    await Promise.all(updates);
  }

  async logCompletion(habitId: UUID, userId: UUID, date: ISODate): Promise<HabitLog> {
    // [HT] LOG — valores exactos que se pasan al INSERT/SELECT
    console.log(
      `[HT REPO:logCompletion] ${Date.now()} habitId=${habitId.slice(0, 6)} date="${date}" localNow="${new Date().toISOString()}" localDate="${new Date().toLocaleDateString()}"`
    );

    // Buscar log existente antes de insertar (idempotente frente a race conditions y duplicados)
    const { data: existing } = await this.client
      .from("habit_logs")
      .select("*")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .eq("completed_at", date)
      .maybeSingle();

    if (existing) {
      // [HT] LOG — idempotencia: ya existía un log, NO se insertó nada nuevo
      console.log(
        `[HT REPO:logCompletion] IDEMPOTENT existing log id=${existing.id.slice(0, 6)} completed_at="${existing.completed_at}" (no INSERT)`
      );
      return {
        id: existing.id,
        habitId: existing.habit_id,
        userId: existing.user_id,
        completedAt: existing.completed_at,
        createdAt: existing.created_at,
      };
    }

    const { data, error } = await this.client
      .from("habit_logs")
      .insert({ habit_id: habitId, user_id: userId, completed_at: date })
      .select()
      .single();

    if (error) throw error;

    // [HT] LOG — INSERT completado, valor real que devolvió la DB
    console.log(
      `[HT REPO:logCompletion] INSERT done id=${data.id.slice(0, 6)} completed_at="${data.completed_at}" (DB value)`
    );

    return {
      id: data.id,
      habitId: data.habit_id,
      userId: data.user_id,
      completedAt: data.completed_at,
      createdAt: data.created_at,
    };
  }

  async removeLog(habitId: UUID, userId: UUID, date: ISODate): Promise<void> {
    const { error } = await this.client
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .eq("completed_at", date);

    if (error) throw error;
  }

  async findAllLogsForUserInRange(userId: UUID, from: ISODate, to: ISODate): Promise<HabitLog[]> {
    const { data, error } = await this.client
      .from("habit_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("completed_at", from)
      .lte("completed_at", to);

    if (error) throw error;
    return data.map((d) => ({
      id: d.id,
      habitId: d.habit_id,
      userId: d.user_id,
      completedAt: d.completed_at,
      createdAt: d.created_at,
    }));
  }

  async findAllStreaksForUser(userId: UUID): Promise<Streak[]> {
    const { data, error } = await this.client
      .from("streaks")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data.map(mapDbToStreak);
  }

  async findLogs(habitId: UUID, from?: ISODate, to?: ISODate): Promise<HabitLog[]> {
    let query = this.client.from("habit_logs").select("*").eq("habit_id", habitId).order("completed_at", { ascending: false });
    if (from) query = query.gte("completed_at", from);
    if (to) query = query.lte("completed_at", to);

    const { data, error } = await query;
    if (error) throw error;

    return data.map((d) => ({
      id: d.id,
      habitId: d.habit_id,
      userId: d.user_id,
      completedAt: d.completed_at,
      createdAt: d.created_at,
    }));
  }

  async findStreak(habitId: UUID): Promise<Streak | null> {
    const { data, error } = await this.client.from("streaks").select("*").eq("habit_id", habitId).single();
    if (error) return null;
    return mapDbToStreak(data);
  }

  async updateStreak(
    habitId: UUID,
    userId: UUID,
    streak: Partial<Omit<Streak, "id" | "habitId" | "userId">>
  ): Promise<Streak> {
    const { data, error } = await this.client
      .from("streaks")
      .upsert({
        habit_id: habitId,
        user_id: userId,
        ...(streak.currentStreak !== undefined && { current_streak: streak.currentStreak }),
        ...(streak.bestStreak !== undefined && { best_streak: streak.bestStreak }),
        ...(streak.lastCompletedAt !== undefined && { last_completed_at: streak.lastCompletedAt }),
        ...(streak.freezeUsedAt !== undefined && { freeze_used_at: streak.freezeUsedAt }),
      }, { onConflict: "habit_id" })
      .select()
      .single();

    if (error) throw error;
    return mapDbToStreak(data);
  }
}
