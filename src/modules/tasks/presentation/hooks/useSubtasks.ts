"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { SubtaskSupabaseRepository } from "../../infrastructure/supabase/SubtaskSupabaseRepository";
import { ListSubtasksUseCase } from "../../domain/use-cases/ListSubtasksUseCase";
import { CreateSubtaskUseCase } from "../../domain/use-cases/CreateSubtaskUseCase";
import { UpdateSubtaskUseCase } from "../../domain/use-cases/UpdateSubtaskUseCase";
import { DeleteSubtaskUseCase } from "../../domain/use-cases/DeleteSubtaskUseCase";
import type { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from "../../domain/entities/Subtask";
import type { UUID } from "@/shared/types/database.types";

export function useSubtasks(userId: UUID, taskId: UUID | null) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getRepo = useCallback(() => new SubtaskSupabaseRepository(createClient()), []);

  const fetch = useCallback(async () => {
    if (!taskId) { setSubtasks([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await new ListSubtasksUseCase(getRepo()).execute(taskId);
      setSubtasks(data);
    } catch {
      setSubtasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, getRepo]);

  const fetchRef = useRef(fetch);
  useEffect(() => { fetchRef.current = fetch; });

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!taskId) return;
    const client = createClient();
    let debounce: ReturnType<typeof setTimeout>;
    const refetch = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => fetchRef.current(), 300);
    };

    const ch = client.channel(`subtasks-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, refetch)
      .subscribe();

    return () => { clearTimeout(debounce); client.removeChannel(ch); };
  }, [taskId]);

  const createSubtask = useCallback(async (input: CreateSubtaskInput): Promise<void> => {
    if (!taskId) return;
    try {
      const created = await new CreateSubtaskUseCase(getRepo()).execute(userId, taskId, input);
      setSubtasks((prev) => [...prev, created]);
    } catch { /* silent fail */ }
  }, [userId, taskId, getRepo]);

  const updateSubtask = useCallback(async (id: UUID, input: UpdateSubtaskInput): Promise<void> => {
    const snapshot = subtasks.find(s => s.id === id);
    try {
      const updated = await new UpdateSubtaskUseCase(getRepo()).execute(id, input);
      setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch {
      if (snapshot) setSubtasks((prev) => prev.map((s) => s.id === id ? snapshot : s));
    }
  }, [getRepo, subtasks]);

  const toggleSubtask = useCallback(async (subtask: Subtask): Promise<void> => {
    const optimistic = { ...subtask, isCompleted: !subtask.isCompleted };
    setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? optimistic : s)));
    try {
      await new UpdateSubtaskUseCase(getRepo()).execute(subtask.id, { isCompleted: optimistic.isCompleted });
    } catch {
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? subtask : s)));
    }
  }, [getRepo]);

  const deleteSubtask = useCallback(async (id: UUID): Promise<void> => {
    const snapshot = subtasks;
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    try {
      await new DeleteSubtaskUseCase(getRepo()).execute(id);
    } catch {
      setSubtasks(snapshot);
    }
  }, [getRepo, subtasks]);

  return { subtasks, isLoading, createSubtask, updateSubtask, toggleSubtask, deleteSubtask };
}
