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
    setLoading(true);
    setError(null);
    try {
      const repo = getRepository();
      const useCase = new GetTodayHabitsUseCase(repo);
      const result = await useCase.execute(userId);
      setHabits(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar hábitos");
    } finally {
      setLoading(false);
    }
  }, [userId, getRepository, setHabits, setLoading, setError]);

  const toggleHabitCompletion = useCallback(
    async (habitId: UUID, isCurrentlyCompleted: boolean) => {
      // Optimistic update
      toggleHabit(habitId);

      try {
        const repo = getRepository();
        const calculateStreak = new CalculateStreakUseCase(repo);

        if (isCurrentlyCompleted) {
          const useCase = new UncompleteHabitUseCase(repo, calculateStreak);
          await useCase.execute(habitId, userId, today());
        } else {
          const useCase = new CompleteHabitUseCase(repo, calculateStreak);
          await useCase.execute(habitId, userId, today());
          // Haptic feedback en móvil
          if ("vibrate" in navigator) navigator.vibrate(10);
          // Check achievements fire-and-forget (no await, no UI block)
          const client = createClient();
          const achievementRepo = new AchievementSupabaseRepository(client);
          void new CheckAndUnlockAchievementsUseCase(repo, achievementRepo).execute(userId).catch(() => {});
        }
      } catch (err) {
        // Revertir optimistic update en caso de error
        toggleHabit(habitId);
        setError(err instanceof Error ? err.message : "Error al actualizar hábito");
      }
    },
    [userId, getRepository, toggleHabit, setError]
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
    toggleHabitCompletion,
  };
}
