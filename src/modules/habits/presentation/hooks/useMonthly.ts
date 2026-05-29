"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { GetMonthlyProgressUseCase, type MonthlyProgress } from "../../domain/use-cases/GetMonthlyProgressUseCase";
import type { UUID } from "@/shared/types/database.types";

export function useMonthly(userId: UUID) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<MonthlyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const client = createClient();
        const repo = new HabitSupabaseRepository(client);
        const result = await new GetMonthlyProgressUseCase(repo).execute(userId, year, month);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos mensuales");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, year, month]);

  const goToPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  const canGoNext = !isCurrentMonth;

  return { data, isLoading, error, year, month, goToPrevMonth, goToNextMonth, canGoNext, isCurrentMonth };
}
