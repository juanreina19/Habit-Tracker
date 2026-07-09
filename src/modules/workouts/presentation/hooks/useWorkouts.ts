"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useId } from "react";
import { format, subMonths } from "date-fns";
import { createClient } from "@/shared/lib/supabase/client";
import { WorkoutSupabaseRepository } from "../../infrastructure/supabase/WorkoutSupabaseRepository";
import { CreateWorkoutUseCase } from "../../domain/use-cases/CreateWorkoutUseCase";
import { UpdateWorkoutUseCase } from "../../domain/use-cases/UpdateWorkoutUseCase";
import { DeleteWorkoutUseCase } from "../../domain/use-cases/DeleteWorkoutUseCase";
import { CompleteWorkoutUseCase } from "../../domain/use-cases/CompleteWorkoutUseCase";
import { UncompleteWorkoutUseCase } from "../../domain/use-cases/UncompleteWorkoutUseCase";
import { calculateWorkoutConsistency } from "../../domain/use-cases/lib/calculateWorkoutConsistency";
import { dayOfWeek, today as getToday } from "@/shared/lib/utils/dates";
import type { Workout, WorkoutWithStatus, CreateWorkoutInput, UpdateWorkoutInput } from "../../domain/entities/Workout";
import type { WorkoutCompletion } from "../../domain/entities/WorkoutCompletion";
import type { UUID, ISODate } from "@/shared/types/database.types";

/**
 * Hook principal del módulo — trae los workouts CON sus ejercicios
 * embebidos (no un accordion perezoso como Studies), porque el panel
 * central debe mostrar de inmediato los ejercicios del día seleccionado.
 * Único dueño de la fuente de verdad de Workouts (no crear estado local
 * paralelo en otros componentes — mismo error ya visto entre habitStore y
 * useSettingsHabits).
 */
export function useWorkouts(userId: UUID) {
  const [workouts, setWorkouts] = useState<WorkoutWithStatus[]>([]);
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const instanceId = useId();
  const getRepo = useCallback(() => new WorkoutSupabaseRepository(createClient()), []);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const todayStr = getToday();
      const [workoutsData, completionsData] = await Promise.all([
        getRepo().findAllByUser(userId, todayStr),
        getRepo().findCompletionsByUser(userId),
      ]);
      setWorkouts(workoutsData);
      setCompletions(completionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar entrenamientos");
    } finally {
      setIsLoading(false);
    }
  }, [userId, getRepo]);

  const fetchRef = useRef(fetch);
  useEffect(() => { fetchRef.current = fetch; });

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime: workouts, sus ejercicios embebidos, y completions — mismo
  // patrón (canal + sufijo de instancia + debounce) que useTasks/useHabits.
  useEffect(() => {
    const client = createClient();
    let debounce: ReturnType<typeof setTimeout>;
    const refetch = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => fetchRef.current(), 300);
    };

    const ch = client.channel(`workouts-all-${userId}-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workouts" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_exercises" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_completions" }, refetch)
      .subscribe();

    return () => { clearTimeout(debounce); client.removeChannel(ch); };
  }, [userId, instanceId]);

  const createWorkout = useCallback(async (input: CreateWorkoutInput): Promise<Workout | null> => {
    try {
      const created = await new CreateWorkoutUseCase(getRepo()).execute(userId, input);
      await fetch();
      return created;
    } catch {
      return null;
    }
  }, [userId, getRepo, fetch]);

  const updateWorkout = useCallback(async (id: UUID, input: UpdateWorkoutInput): Promise<void> => {
    try {
      await new UpdateWorkoutUseCase(getRepo()).execute(id, input);
      await fetch();
    } catch {
      // Realtime/fetch reflejará el estado real en el próximo refresco.
    }
  }, [getRepo, fetch]);

  const deleteWorkout = useCallback(async (id: UUID): Promise<void> => {
    const snapshot = workouts;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    try {
      await new DeleteWorkoutUseCase(getRepo()).execute(id);
    } catch {
      setWorkouts(snapshot);
    }
  }, [getRepo, workouts]);

  /** Marcar/desmarcar completado es un solo tap, sin fricción — igual que Habits. */
  const toggleWorkoutCompletion = useCallback(async (workout: WorkoutWithStatus, dateStr: ISODate = getToday()) => {
    const wasCompleted = dateStr === getToday() ? workout.isCompletedToday : false;
    if (dateStr === getToday()) {
      setWorkouts((prev) => prev.map((w) => (w.id === workout.id ? { ...w, isCompletedToday: !wasCompleted } : w)));
    }
    try {
      if (wasCompleted) {
        await new UncompleteWorkoutUseCase(getRepo()).execute(workout.id, dateStr);
        setCompletions((prev) => prev.filter((c) => !(c.workoutId === workout.id && c.completedAt === dateStr)));
      } else {
        const created = await new CompleteWorkoutUseCase(getRepo()).execute(userId, { workoutId: workout.id, completedAt: dateStr });
        setCompletions((prev) => [created, ...prev.filter((c) => !(c.workoutId === workout.id && c.completedAt === dateStr))]);
      }
    } catch {
      if (dateStr === getToday()) {
        setWorkouts((prev) => prev.map((w) => (w.id === workout.id ? { ...w, isCompletedToday: wasCompleted } : w)));
      }
    }
  }, [userId, getRepo]);

  // ── Widgets — todo se calcula aquí, sin un GetStatsUseCase separado ────────

  const stats = useMemo(() => {
    const todayStr = getToday();
    const { streak, weeklyConsistencyPct } = calculateWorkoutConsistency(workouts, completions, todayStr);

    // Progreso mensual: últimos 6 meses, conteo de completions por mes.
    const now = new Date();
    const monthlyCounts = Array.from({ length: 6 }, (_, idx) => {
      const d = subMonths(now, 5 - idx);
      const monthKey = format(d, "yyyy-MM");
      return {
        month: format(d, "MMM"),
        count: completions.filter((c) => c.completedAt.slice(0, 7) === monthKey).length,
      };
    });

    // Recientes: últimas 5 completions, con el nombre del workout resuelto.
    const workoutById = new Map(workouts.map((w) => [w.id, w]));
    const recentCompletions = completions.slice(0, 5).map((c) => ({
      workoutId: c.workoutId,
      workoutName: workoutById.get(c.workoutId)?.name ?? "—",
      completedAt: c.completedAt,
      durationMin: c.durationMin,
    }));

    // % Strength/Cardio: a nivel de ejercicio (no de workout), para que los
    // workouts "Mixed" se repartan correctamente entre ambos.
    const allExercises = workouts.flatMap((w) => w.exercises);
    const strengthCount = allExercises.filter((e) => e.type === "strength").length;
    const cardioCount = allExercises.filter((e) => e.type === "cardio").length;
    const totalExercises = strengthCount + cardioCount;
    const strengthPct = totalExercises > 0 ? Math.round((strengthCount / totalExercises) * 100) : 0;
    const cardioPct = totalExercises > 0 ? 100 - strengthPct : 0;

    // Próximo entrenamiento: hoy si aún no se completó, si no el siguiente
    // día activo hacia adelante (hasta 7 días).
    const todayDow = dayOfWeek(new Date());
    let nextWorkout: WorkoutWithStatus | null = null;
    for (let offset = 0; offset < 7; offset++) {
      const dow = ((todayDow - 1 + offset) % 7) + 1;
      const candidates = workouts
        .filter((w) => w.isActive && w.dayOfWeek === dow && (offset > 0 || !w.isCompletedToday))
        .sort((a, b) => a.order - b.order);
      if (candidates.length > 0) { nextWorkout = candidates[0]; break; }
    }

    return { streak, weeklyConsistencyPct, monthlyCounts, recentCompletions, strengthPct, cardioPct, nextWorkout };
  }, [workouts, completions]);

  return {
    workouts,
    completions,
    isLoading,
    error,
    stats,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    toggleWorkoutCompletion,
    refetch: fetch,
  };
}
