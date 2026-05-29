"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { GetWeeklyProgressUseCase, type WeeklyProgress } from "../../domain/use-cases/GetWeeklyProgressUseCase";
import type { UUID } from "@/shared/types/database.types";

export function useWeekly(userId: UUID) {
  const [data, setData] = useState<WeeklyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const client = createClient();
        const repo = new HabitSupabaseRepository(client);
        const result = await new GetWeeklyProgressUseCase(repo).execute(userId);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos semanales");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

  return { data, isLoading, error };
}
