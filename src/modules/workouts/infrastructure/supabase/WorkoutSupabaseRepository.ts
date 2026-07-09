import type { SupabaseClient } from "@supabase/supabase-js";
import type { UUID, ISODate, DbWorkout, DbWorkoutExercise, DbWorkoutCompletion } from "@/shared/types/database.types";
import type { IWorkoutRepository } from "../../domain/repositories/IWorkoutRepository";
import type { Workout, WorkoutWithStatus, CreateWorkoutInput, UpdateWorkoutInput } from "../../domain/entities/Workout";
import type { WorkoutCompletion, LogWorkoutCompletionInput } from "../../domain/entities/WorkoutCompletion";
import type { WorkoutExercise } from "../../domain/entities/WorkoutExercise";

function mapWorkout(row: DbWorkout): Workout {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    name: row.name,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    estimatedDurationMin: row.estimated_duration_min,
    order: row.order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapExercise(row: DbWorkoutExercise): WorkoutExercise {
  return {
    id: row.id,
    workoutId: row.workout_id,
    userId: row.user_id,
    catalogExerciseId: row.catalog_exercise_id,
    name: row.name,
    type: row.type,
    order: row.order,
    sets: row.sets,
    reps: row.reps,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapCompletion(row: DbWorkoutCompletion): WorkoutCompletion {
  return {
    id: row.id,
    workoutId: row.workout_id,
    userId: row.user_id,
    completedAt: row.completed_at,
    durationMin: row.duration_min,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WorkoutSupabaseRepository implements IWorkoutRepository {
  constructor(private readonly client: SupabaseClient<any>) {}

  async findAllByUser(userId: UUID, todayStr: ISODate): Promise<WorkoutWithStatus[]> {
    const [workoutsResult, completionsResult] = await Promise.all([
      this.client
        .from("workouts")
        .select("*, workout_exercises(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true })
        .order("order", { ascending: true }),
      this.client
        .from("workout_completions")
        .select("workout_id")
        .eq("user_id", userId)
        .eq("completed_at", todayStr),
    ]);
    if (workoutsResult.error) throw workoutsResult.error;
    if (completionsResult.error) throw completionsResult.error;

    const completedIds = new Set((completionsResult.data ?? []).map((c: { workout_id: UUID }) => c.workout_id));

    return (workoutsResult.data ?? []).map((row: DbWorkout & { workout_exercises: DbWorkoutExercise[] }) => ({
      ...mapWorkout(row),
      exercises: (row.workout_exercises ?? [])
        .map(mapExercise)
        .sort((a: WorkoutExercise, b: WorkoutExercise) => a.order - b.order),
      isCompletedToday: completedIds.has(row.id),
    }));
  }

  async create(userId: UUID, input: CreateWorkoutInput): Promise<Workout> {
    const { data, error } = await this.client
      .from("workouts")
      .insert({
        user_id: userId,
        category_id: input.categoryId ?? null,
        name: input.name.trim(),
        day_of_week: input.dayOfWeek ?? null,
        start_time: input.startTime ?? null,
        estimated_duration_min: input.estimatedDurationMin ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapWorkout(data);
  }

  async update(id: UUID, input: UpdateWorkoutInput): Promise<Workout> {
    const patch: Record<string, unknown> = {};
    if (input.categoryId !== undefined) patch.category_id = input.categoryId;
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.dayOfWeek !== undefined) patch.day_of_week = input.dayOfWeek;
    if (input.startTime !== undefined) patch.start_time = input.startTime;
    if (input.estimatedDurationMin !== undefined) patch.estimated_duration_min = input.estimatedDurationMin;
    if (input.order !== undefined) patch.order = input.order;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await this.client
      .from("workouts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapWorkout(data);
  }

  async delete(id: UUID): Promise<void> {
    const { error } = await this.client.from("workouts").delete().eq("id", id);
    if (error) throw error;
  }

  async reorder(orderedIds: UUID[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.client.from("workouts").update({ order: index }).eq("id", id)
      )
    );
  }

  async logCompletion(userId: UUID, input: LogWorkoutCompletionInput): Promise<WorkoutCompletion> {
    const { data, error } = await this.client
      .from("workout_completions")
      .upsert(
        {
          user_id: userId,
          workout_id: input.workoutId,
          completed_at: input.completedAt,
          duration_min: input.durationMin ?? null,
        },
        { onConflict: "workout_id,completed_at" }
      )
      .select()
      .single();
    if (error) throw error;
    return mapCompletion(data);
  }

  async removeCompletion(workoutId: UUID, completedAt: ISODate): Promise<void> {
    const { error } = await this.client
      .from("workout_completions")
      .delete()
      .eq("workout_id", workoutId)
      .eq("completed_at", completedAt);
    if (error) throw error;
  }

  async findCompletionsByUser(userId: UUID): Promise<WorkoutCompletion[]> {
    const { data, error } = await this.client
      .from("workout_completions")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapCompletion);
  }
}
