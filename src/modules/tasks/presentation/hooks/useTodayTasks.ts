"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { TaskSupabaseRepository } from "../../infrastructure/supabase/TaskSupabaseRepository";
import { GetTodayTasksUseCase } from "../../domain/use-cases/GetTodayTasksUseCase";
import { ToggleTaskUseCase } from "../../domain/use-cases/ToggleTaskUseCase";
import type { Task } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

export function useTodayTasks(userId: UUID) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRepo = useCallback(() => {
    return new TaskSupabaseRepository(createClient());
  }, []);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const data = await new GetTodayTasksUseCase(getRepo()).execute(userId);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tareas");
    } finally {
      setIsLoading(false);
    }
  }, [userId, getRepo]);

  const fetchRef = useRef(fetch);
  useEffect(() => { fetchRef.current = fetch; });

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime
  useEffect(() => {
    const client = createClient();
    let debounce: ReturnType<typeof setTimeout>;

    const channel = client
      .channel(`tasks-today-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => fetchRef.current(), 300);
        })
      .subscribe();

    return () => {
      clearTimeout(debounce);
      client.removeChannel(channel);
    };
  }, [userId]);

  const toggleTask = useCallback(async (task: Task): Promise<void> => {
    const optimistic = { ...task, completedAt: task.completedAt ? null : new Date().toISOString() };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));
    try {
      const updated = await new ToggleTaskUseCase(getRepo()).execute(task);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setError(err instanceof Error ? err.message : "Error al actualizar tarea");
    }
  }, [getRepo]);

  return { tasks, isLoading, error, toggleTask };
}
