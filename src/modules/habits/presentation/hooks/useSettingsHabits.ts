"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import type { Habit } from "../../domain/entities/Habit";
import type { CreateHabitInput, UpdateHabitInput } from "../../domain/repositories/IHabitRepository";
import type { UUID } from "@/shared/types/database.types";

export function useSettingsHabits(userId: UUID) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRepo = useCallback(
    () => new HabitSupabaseRepository(createClient()),
    []
  );

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getRepo().findAllByUser(userId);
      setHabits(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar hábitos");
    } finally {
      setIsLoading(false);
    }
  }, [userId, getRepo]);

  const create = useCallback(
    async (input: CreateHabitInput): Promise<Habit> => {
      const created = await getRepo().create(userId, input);
      setHabits((prev) => [...prev, created]);
      return created;
    },
    [userId, getRepo]
  );

  const update = useCallback(
    async (id: UUID, input: UpdateHabitInput): Promise<Habit> => {
      const updated = await getRepo().update(id, input);
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
      return updated;
    },
    [getRepo]
  );

  const deactivate = useCallback(
    async (id: UUID): Promise<void> => {
      await getRepo().deactivate(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    },
    [getRepo]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { habits, isLoading, error, refetch: fetch, create, update, deactivate };
}
