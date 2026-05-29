"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { GetMonthlyProgressUseCase, type MonthlyProgress } from "../../domain/use-cases/GetMonthlyProgressUseCase";
import type { UUID } from "@/shared/types/database.types";

export function useMonthly(userId: UUID, userCreatedAt?: string) {
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
      if (m === 0) { setYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const canGoNext = !isCurrentMonth;

  const canGoPrev = useMemo(() => {
    if (!userCreatedAt) return true;
    const created = new Date(userCreatedAt);
    const createdYear = created.getFullYear();
    const createdMonth = created.getMonth();
    // Can go prev if prev month is >= account creation month
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    return prevYear > createdYear || (prevYear === createdYear && prevMonth >= createdMonth);
  }, [year, month, userCreatedAt]);

  return { data, isLoading, error, year, month, goToPrevMonth, goToNextMonth, canGoNext, canGoPrev, isCurrentMonth };
}
