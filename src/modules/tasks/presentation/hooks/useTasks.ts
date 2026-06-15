"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { TaskSupabaseRepository } from "../../infrastructure/supabase/TaskSupabaseRepository";
import { SubtaskSupabaseRepository } from "../../infrastructure/supabase/SubtaskSupabaseRepository";
import { GetTasksUseCase } from "../../domain/use-cases/GetTasksUseCase";
import { CreateTaskUseCase } from "../../domain/use-cases/CreateTaskUseCase";
import { UpdateTaskUseCase } from "../../domain/use-cases/UpdateTaskUseCase";
import { ToggleTaskUseCase } from "../../domain/use-cases/ToggleTaskUseCase";
import { DeleteTaskUseCase } from "../../domain/use-cases/DeleteTaskUseCase";
import { GetSubtaskCountsUseCase } from "../../domain/use-cases/GetSubtaskCountsUseCase";
import { isRecurring } from "../../domain/entities/Task";
import type { Task, TaskWithStatus, CreateTaskInput, UpdateTaskInput } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { today } from "@/shared/lib/utils/dates";

export function useTasks(userId: UUID) {
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRepo = useCallback(() => new TaskSupabaseRepository(createClient()), []);
  const getSubtaskRepo = useCallback(() => new SubtaskSupabaseRepository(createClient()), []);

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
      const data = await new GetTasksUseCase(getRepo()).execute(userId, today());
      const counts = await new GetSubtaskCountsUseCase(getSubtaskRepo()).execute(data.map((t) => t.id));
      if (fetchGeneration.current !== generation) return;
      if (pendingToggles.current.size > 0) return;
      setTasks(data.map((t) => {
        const count = counts.get(t.id);
        return count ? { ...t, subtaskTotal: count.total, subtaskCompleted: count.completed } : t;
      }));
    } catch (err) {
      if (fetchGeneration.current === generation) {
        setError(err instanceof Error ? err.message : "Error al cargar tareas");
      }
    } finally {
      if (fetchGeneration.current === generation) setIsLoading(false);
    }
  }, [userId, getRepo, getSubtaskRepo]);

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

    // Sin filtro user_id: igual que en useHabits.ts, el filtrado por usuario en postgres_changes
    // requiere RLS específico para Realtime que no está configurado. Recibimos cambios de todos
    // los usuarios pero el refetch ya está RLS-scoped (TaskSupabaseRepository filtra por user_id).
    const ch = client.channel(`tasks-all-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, refetch)
      .subscribe();

    return () => { clearTimeout(debounce); client.removeChannel(ch); };
  }, [userId]);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<void> => {
    const created = await new CreateTaskUseCase(getRepo()).execute(userId, input);
    setTasks((prev) => [{ ...created, isCompletedToday: false }, ...prev]);
  }, [userId, getRepo]);

  // Recibe `Task` (no `TaskWithStatus`): solo se usa `task.id`/`task.dueDate`, y el caller
  // (TaskFormDialog → onUpdate) trabaja con la entidad base, no con el estado derivado de "hoy".
  const updateTask = useCallback(async (task: Task, input: UpdateTaskInput): Promise<void> => {
    const updated = await new UpdateTaskUseCase(getRepo()).execute(task, input);
    setTasks((prev) => prev.map((t) => {
      if (t.id !== task.id) return t;
      // Preservar isCompletedToday para tareas recurrentes (no cambia con update)
      const isCompletedToday = isRecurring(updated)
        ? t.isCompletedToday
        : updated.completedAt !== null;
      return { ...updated, isCompletedToday };
    }));
  }, [getRepo]);

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

  const deleteTask = useCallback(async (id: UUID): Promise<void> => {
    const snapshot = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await new DeleteTaskUseCase(getRepo()).execute(id);
    } catch (err) {
      setTasks(snapshot);
      setError(err instanceof Error ? err.message : "Error al eliminar tarea");
    }
  }, [getRepo, tasks]);

  return { tasks, isLoading, error, createTask, updateTask, toggleTask, deleteTask };
}
