"use client";

import { useEffect, useCallback } from "react";
import { useHabitStore } from "../store/habitStore";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { AchievementSupabaseRepository } from "@/modules/achievements/infrastructure/supabase/AchievementSupabaseRepository";
import { CheckAndUnlockAchievementsUseCase } from "@/modules/achievements/domain/use-cases/CheckAndUnlockAchievementsUseCase";
import { GetTodayHabitsUseCase } from "../../domain/use-cases/GetTodayHabitsUseCase";
import { CompleteHabitUseCase } from "../../domain/use-cases/CompleteHabitUseCase";
import { UncompleteHabitUseCase } from "../../domain/use-cases/UncompleteHabitUseCase";
import { CalculateStreakUseCase } from "../../domain/use-cases/CalculateStreakUseCase";
import { UseFreezeUseCase } from "../../domain/use-cases/UseFreezeUseCase";
import { today } from "@/shared/lib/utils/dates";
import type { UUID } from "@/shared/types/database.types";

export function useHabits(userId: UUID) {
  const { setHabits, toggleHabit, setLoading, setError, habits, isLoading, error,
    completedCount, totalCount, completionPercentage, estimatedMinutes } = useHabitStore();

  const getRepository = useCallback(() => {
    const client = createClient();
    return new HabitSupabaseRepository(client);
  }, []);

  const fetchHabits = useCallback(async () => {
    // Si hay datos en cache (persist), no mostramos skeleton — actualización silenciosa
    const hasCache = useHabitStore.getState().habits.length > 0;
    if (!hasCache) setLoading(true);
    setError(null);
    try {
      const repo = getRepository();
      const result = await new GetTodayHabitsUseCase(repo).execute(userId);
      setHabits(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar hábitos");
    } finally {
      setLoading(false);
    }
  }, [userId, getRepository, setHabits, setLoading, setError]);

  // Complete a habit (immediate, with achievement check)
  const completeHabit = useCallback(
    async (habitId: UUID) => {
      toggleHabit(habitId);
      try {
        const repo = getRepository();
        const calculateStreak = new CalculateStreakUseCase(repo);
        await new CompleteHabitUseCase(repo, calculateStreak).execute(habitId, userId, today());
        if ("vibrate" in navigator) navigator.vibrate(10);
        const client = createClient();
        void new CheckAndUnlockAchievementsUseCase(
          repo,
          new AchievementSupabaseRepository(client)
        ).execute(userId).catch(() => {});
      } catch (err) {
        toggleHabit(habitId);
        setError(err instanceof Error ? err.message : "Error al completar hábito");
      }
    },
    [userId, getRepository, toggleHabit, setError]
  );

  // Uncheck a habit with undo support: optimistic update immediately,
  // API call deferred 3s. Returns a cancel function for undo.
  const uncheckHabit = useCallback(
    (habitId: UUID): (() => void) => {
      toggleHabit(habitId); // optimistic

      let cancelled = false;
      const timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const repo = getRepository();
          const calculateStreak = new CalculateStreakUseCase(repo);
          await new UncompleteHabitUseCase(repo, calculateStreak).execute(habitId, userId, today());
        } catch (err) {
          if (!cancelled) {
            toggleHabit(habitId); // revert on API error
            setError(err instanceof Error ? err.message : "Error al desmarcar hábito");
          }
        }
      }, 3000);

      return () => {
        cancelled = true;
        clearTimeout(timer);
        toggleHabit(habitId); // revert optimistic update
      };
    },
    [userId, getRepository, toggleHabit, setError]
  );

  // Use freeze (grace day) for a habit
  const freezeHabit = useCallback(
    async (habitId: UUID): Promise<void> => {
      const repo = getRepository();
      await new UseFreezeUseCase(repo).execute(habitId, userId);
      await fetchHabits(); // refetch to update streak.freezeUsedAt
    },
    [userId, getRepository, fetchHabits]
  );

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return {
    habits,
    isLoading,
    error,
    completedCount,
    totalCount,
    completionPercentage,
    estimatedMinutes,
    refetch: fetchHabits,
    completeHabit,
    uncheckHabit,
    freezeHabit,
  };
}
