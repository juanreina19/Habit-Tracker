"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { TaskSupabaseRepository } from "../../infrastructure/supabase/TaskSupabaseRepository";
import { GetTasksUseCase } from "../../domain/use-cases/GetTasksUseCase";
import { CreateTaskUseCase } from "../../domain/use-cases/CreateTaskUseCase";
import { UpdateTaskUseCase } from "../../domain/use-cases/UpdateTaskUseCase";
import { ToggleTaskUseCase } from "../../domain/use-cases/ToggleTaskUseCase";
import { DeleteTaskUseCase } from "../../domain/use-cases/DeleteTaskUseCase";
import type { Task, CreateTaskInput, UpdateTaskInput } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

export function useTasks(userId: UUID) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRepo = useCallback(() => {
    return new TaskSupabaseRepository(createClient());
  }, []);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const data = await new GetTasksUseCase(getRepo()).execute(userId);
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
      .channel(`tasks-all-${userId}`)
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

  const createTask = useCallback(async (input: CreateTaskInput): Promise<void> => {
    const created = await new CreateTaskUseCase(getRepo()).execute(userId, input);
    setTasks((prev) => [created, ...prev]);
  }, [userId, getRepo]);

  const updateTask = useCallback(async (id: UUID, input: UpdateTaskInput): Promise<void> => {
    const updated = await new UpdateTaskUseCase(getRepo()).execute(id, input);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }, [getRepo]);

  const toggleTask = useCallback(async (task: Task): Promise<void> => {
    // Optimistic
    const optimistic = { ...task, completedAt: task.completedAt ? null : new Date().toISOString() };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));
    try {
      const updated = await new ToggleTaskUseCase(getRepo()).execute(task);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      // Revert
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setError(err instanceof Error ? err.message : "Error al actualizar tarea");
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
