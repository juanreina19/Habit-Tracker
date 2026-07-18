import type { SupabaseClient } from "@supabase/supabase-js";
import type { UUID, DbWorkoutExercise, DbExerciseCatalogItem } from "@/shared/types/database.types";
import type { IWorkoutExerciseRepository } from "../../domain/repositories/IWorkoutExerciseRepository";
import type {
  WorkoutExercise,
  CreateWorkoutExerciseInput,
  UpdateWorkoutExerciseInput,
  ExerciseCatalogItem,
  ExerciseType,
} from "../../domain/entities/WorkoutExercise";

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
    durationSec: row.duration_sec,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapCatalogItem(row: DbExerciseCatalogItem): ExerciseCatalogItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    defaultType: row.default_type,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WorkoutExerciseSupabaseRepository implements IWorkoutExerciseRepository {
  constructor(private readonly client: SupabaseClient<any>) {}

  async listByWorkout(workoutId: UUID): Promise<WorkoutExercise[]> {
    const { data, error } = await this.client
      .from("workout_exercises")
      .select("*")
      .eq("workout_id", workoutId)
      .order("order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapExercise);
  }

  async create(userId: UUID, input: CreateWorkoutExerciseInput): Promise<WorkoutExercise> {
    const { count } = await this.client
      .from("workout_exercises")
      .select("id", { count: "exact", head: true })
      .eq("workout_id", input.workoutId);

    const { data, error } = await this.client
      .from("workout_exercises")
      .insert({
        workout_id: input.workoutId,
        user_id: userId,
        catalog_exercise_id: input.catalogExerciseId ?? null,
        name: input.name.trim(),
        type: input.type,
        order: count ?? 0,
        sets: input.sets ?? null,
        reps: input.reps ?? null,
        duration_sec: input.durationSec ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapExercise(data);
  }

  async update(id: UUID, input: UpdateWorkoutExerciseInput): Promise<WorkoutExercise> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.type !== undefined) patch.type = input.type;
    if (input.order !== undefined) patch.order = input.order;
    if (input.sets !== undefined) patch.sets = input.sets;
    if (input.reps !== undefined) patch.reps = input.reps;
    if (input.durationSec !== undefined) patch.duration_sec = input.durationSec;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await this.client
      .from("workout_exercises")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapExercise(data);
  }

  async delete(id: UUID): Promise<void> {
    const { error } = await this.client.from("workout_exercises").delete().eq("id", id);
    if (error) throw error;
  }

  async reorder(orderedIds: UUID[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.client.from("workout_exercises").update({ order: index }).eq("id", id)
      )
    );
  }

  async searchCatalog(userId: UUID, query: string): Promise<ExerciseCatalogItem[]> {
    const { data, error } = await this.client
      .from("exercise_catalog")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", `${query}%`)
      .order("name", { ascending: true })
      .limit(8);
    if (error) throw error;
    return (data ?? []).map(mapCatalogItem);
  }

  async listCatalog(userId: UUID): Promise<ExerciseCatalogItem[]> {
    const { data, error } = await this.client
      .from("exercise_catalog")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapCatalogItem);
  }

  async upsertCatalogEntry(userId: UUID, name: string, defaultType: ExerciseType | null): Promise<ExerciseCatalogItem> {
    const trimmed = name.trim();

    // Matching case-insensitive resuelto en la app: un índice único sobre
    // lower(name) no es un target válido para el onConflict de PostgREST,
    // así que se busca primero por ilike exacto y solo se inserta si no existe.
    const { data: existing, error: searchError } = await this.client
      .from("exercise_catalog")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", trimmed)
      .limit(1)
      .maybeSingle();
    if (searchError) throw searchError;
    if (existing) return mapCatalogItem(existing);

    const { data, error } = await this.client
      .from("exercise_catalog")
      .insert({ user_id: userId, name: trimmed, default_type: defaultType })
      .select()
      .single();
    if (error) throw error;
    return mapCatalogItem(data);
  }

  async updateCatalogEntry(id: UUID, input: { name?: string; defaultType?: ExerciseType | null }): Promise<ExerciseCatalogItem> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.defaultType !== undefined) patch.default_type = input.defaultType;

    const { data, error } = await this.client
      .from("exercise_catalog")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapCatalogItem(data);
  }

  async deleteCatalogEntry(id: UUID): Promise<void> {
    const { error } = await this.client.from("exercise_catalog").delete().eq("id", id);
    if (error) throw error;
  }
}
