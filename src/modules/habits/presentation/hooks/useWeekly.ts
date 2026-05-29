"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { startOfWeek, subWeeks } from "date-fns";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { GetWeeklyProgressUseCase, type WeeklyProgress } from "../../domain/use-cases/GetWeeklyProgressUseCase";
import type { UUID } from "@/shared/types/database.types";

export function useWeekly(userId: UUID, userCreatedAt?: string) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = last week, etc.
  const [data, setData] = useState<WeeklyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The Monday of the displayed week
  const weekStart = useMemo(() => {
    const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return subWeeks(currentMonday, weekOffset);
  }, [weekOffset]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const client = createClient();
        const repo = new HabitSupabaseRepository(client);
        const result = await new GetWeeklyProgressUseCase(repo).execute(userId, weekStart);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos semanales");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId, weekStart]);

  const canGoNext = weekOffset > 0;

  const canGoPrev = useMemo(() => {
    if (!userCreatedAt) return weekOffset < 52; // fallback: max 1 year back
    const createdWeekStart = startOfWeek(new Date(userCreatedAt), { weekStartsOn: 1 });
    const prevWeekStart = subWeeks(weekStart, 1);
    return prevWeekStart >= createdWeekStart;
  }, [weekStart, weekOffset, userCreatedAt]);

  const goToPrevWeek = useCallback(() => setWeekOffset((o) => o + 1), []);
  const goToNextWeek = useCallback(() => setWeekOffset((o) => o - 1), []);

  const isCurrentWeek = weekOffset === 0;

  return { data, isLoading, error, weekStart, goToPrevWeek, goToNextWeek, canGoPrev, canGoNext, isCurrentWeek };
}
