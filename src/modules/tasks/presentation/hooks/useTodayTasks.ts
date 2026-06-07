"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { TaskSupabaseRepository } from "../../infrastructure/supabase/TaskSupabaseRepository";
import { GetTodayTasksUseCase } from "../../domain/use-cases/GetTodayTasksUseCase";
import { ToggleTaskUseCase } from "../../domain/use-cases/ToggleTaskUseCase";
import { isRecurring } from "../../domain/entities/Task";
import type { TaskWithStatus } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { today } from "@/shared/lib/utils/dates";

export function useTodayTasks(userId: UUID) {
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRepo = useCallback(() => new TaskSupabaseRepository(createClient()), []);

  // Generación del fetch — descarta resultados de fetches obsoletos que resuelven fuera de orden
  // (evita que una respuesta vieja pise el estado de una más reciente).
  const fetchGeneration = useRef(0);
  // Tareas con un toggle optimista en vuelo. Mientras existan, cualquier fetch que regrese
  // se descarta por completo: protege contra que un snapshot stale de la DB sobrescriba el
  // estado recién aplicado (p.ej. una tarea recién completada "volviendo a aparecer pendiente").
  // Mismo patrón que pendingCompletes/pendingUnchecks en useHabits.ts.
  const pendingToggles = useRef(new Set<UUID>());

  const fetch = useCallback(async () => {
    const generation = ++fetchGeneration.current;
    setError(null);
    try {
      const data = await new GetTodayTasksUseCase(getRepo()).execute(userId, today());
      if (fetchGeneration.current !== generation) return;
      if (pendingToggles.current.size > 0) return;
      setTasks(data);
    } catch (err) {
      if (fetchGeneration.current === generation) {
        setError(err instanceof Error ? err.message : "Error al cargar tareas");
      }
    } finally {
      if (fetchGeneration.current === generation) setIsLoading(false);
    }
  }, [userId, getRepo]);

  const fetchRef = useRef(fetch);
  useEffect(() => { fetchRef.current = fetch; });

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime: tareas + completaciones recurrentes
  useEffect(() => {
    const client = createClient();
    let debounce: ReturnType<typeof setTimeout>;
    const refetch = () => {
      if (pendingToggles.current.size > 0) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => fetchRef.current(), 300);
    };

    const ch = client.channel(`tasks-today-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks",            filter: `user_id=eq.${userId}` }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions", filter: `user_id=eq.${userId}` }, refetch)
      .subscribe();

    return () => { clearTimeout(debounce); client.removeChannel(ch); };
  }, [userId]);

  const toggleTask = useCallback(async (task: TaskWithStatus): Promise<void> => {
    if (pendingToggles.current.has(task.id)) return; // ignora doble-tap mientras el primero resuelve

    const nowDone = !task.isCompletedToday;
    const optimistic: TaskWithStatus = {
      ...task,
      isCompletedToday: nowDone,
      completedAt: isRecurring(task) ? task.completedAt : (nowDone ? new Date().toISOString() : null),
    };
    pendingToggles.current.add(task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));
    try {
      await new ToggleTaskUseCase(getRepo()).execute(task, today());
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setError(err instanceof Error ? err.message : "Error al actualizar tarea");
    } finally {
      pendingToggles.current.delete(task.id);
    }
  }, [getRepo]);

  return { tasks, isLoading, error, toggleTask };
}
