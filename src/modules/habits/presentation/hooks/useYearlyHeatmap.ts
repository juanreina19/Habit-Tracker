"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { GetYearlyProgressUseCase } from "../../domain/use-cases/GetYearlyProgressUseCase";
import type { DayProgress } from "../../domain/use-cases/GetMonthlyProgressUseCase";
import type { UUID } from "@/shared/types/database.types";

export function useYearlyHeatmap(userId: UUID, year: number) {
  const [days, setDays] = useState<DayProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const client = createClient();
        const repo = new HabitSupabaseRepository(client);
        const result = await new GetYearlyProgressUseCase(repo).execute(userId, year);
        setDays(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos anuales");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, year]);

  return { days, isLoading, error };
}
