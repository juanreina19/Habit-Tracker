"use client";

import { useState, useEffect, useCallback, useRef, useId } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { WorkoutExerciseSupabaseRepository } from "../../infrastructure/supabase/WorkoutExerciseSupabaseRepository";
import { CreateWorkoutExerciseUseCase } from "../../domain/use-cases/CreateWorkoutExerciseUseCase";
import { UpdateWorkoutExerciseUseCase } from "../../domain/use-cases/UpdateWorkoutExerciseUseCase";
import { DeleteWorkoutExerciseUseCase } from "../../domain/use-cases/DeleteWorkoutExerciseUseCase";
import { ReorderWorkoutExercisesUseCase } from "../../domain/use-cases/ReorderWorkoutExercisesUseCase";
import type { WorkoutExercise, CreateWorkoutExerciseInput, UpdateWorkoutExerciseInput, ExerciseCatalogItem } from "../../domain/entities/WorkoutExercise";
import type { UUID } from "@/shared/types/database.types";

/**
 * Hook secundario, usado solo dentro de WorkoutFormDialog — mismo rol que
 * useSubtasks respecto a useTasks: su canal Realtime está atado a un
 * workoutId dinámico que cambia cada vez que el diálogo abre para un
 * workout distinto, una granularidad de suscripción distinta a la de
 * useWorkouts (que trae todos los workouts con sus ejercicios embebidos).
 */
export function useWorkoutExercises(userId: UUID, workoutId: UUID | null) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sufijo único por instancia — evita colisión de canal si el diálogo se
  // reabre o si en el futuro hay más de una instancia montada a la vez.
  const instanceId = useId();

  const getRepo = useCallback(() => new WorkoutExerciseSupabaseRepository(createClient()), []);

  const fetch = useCallback(async () => {
    if (!workoutId) { setExercises([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await getRepo().listByWorkout(workoutId);
      setExercises(data);
    } catch {
      setExercises([]);
    } finally {
      setIsLoading(false);
    }
  }, [workoutId, getRepo]);

  const fetchRef = useRef(fetch);
  useEffect(() => { fetchRef.current = fetch; });

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!workoutId) return;
    const client = createClient();
    let debounce: ReturnType<typeof setTimeout>;
    const refetch = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => fetchRef.current(), 300);
    };

    const ch = client.channel(`workout-exercises-${workoutId}-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_exercises" }, refetch)
      .subscribe();

    return () => { clearTimeout(debounce); client.removeChannel(ch); };
  }, [workoutId, instanceId]);

  const createExercise = useCallback(async (input: CreateWorkoutExerciseInput): Promise<WorkoutExercise | null> => {
    try {
      const created = await new CreateWorkoutExerciseUseCase(getRepo()).execute(userId, input);
      setExercises((prev) => [...prev, created]);
      return created;
    } catch {
      return null;
    }
  }, [userId, getRepo]);

  const updateExercise = useCallback(async (id: UUID, input: UpdateWorkoutExerciseInput): Promise<void> => {
    const snapshot = exercises.find((e) => e.id === id);
    try {
      const updated = await new UpdateWorkoutExerciseUseCase(getRepo()).execute(id, input);
      setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch {
      if (snapshot) setExercises((prev) => prev.map((e) => (e.id === id ? snapshot : e)));
    }
  }, [getRepo, exercises]);

  const deleteExercise = useCallback(async (id: UUID): Promise<void> => {
    const snapshot = exercises;
    setExercises((prev) => prev.filter((e) => e.id !== id));
    try {
      await new DeleteWorkoutExerciseUseCase(getRepo()).execute(id);
    } catch {
      setExercises(snapshot);
    }
  }, [getRepo, exercises]);

  const reorderExercises = useCallback(async (next: WorkoutExercise[]): Promise<void> => {
    const snapshot = exercises;
    setExercises(next);
    try {
      await new ReorderWorkoutExercisesUseCase(getRepo()).execute(next.map((e) => e.id));
    } catch {
      setExercises(snapshot);
    }
  }, [getRepo, exercises]);

  const searchCatalog = useCallback(async (query: string): Promise<ExerciseCatalogItem[]> => {
    if (!query.trim()) return [];
    try {
      return await getRepo().searchCatalog(userId, query.trim());
    } catch {
      return [];
    }
  }, [userId, getRepo]);

  return { exercises, isLoading, createExercise, updateExercise, deleteExercise, reorderExercises, searchCatalog };
}
