import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HabitWithStatus } from "../../domain/entities/Habit";
import type { UUID } from "@/shared/types/database.types";

interface HabitState {
  habits: HabitWithStatus[];
  isLoading: boolean;
  error: string | null;
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  estimatedMinutes: number;

  setHabits: (data: {
    habits: HabitWithStatus[];
    completedCount: number;
    totalCount: number;
    completionPercentage: number;
    estimatedMinutes: number;
  }) => void;

  toggleHabit: (habitId: UUID) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set) => ({
      habits: [],
      isLoading: false,
      error: null,
      completedCount: 0,
      totalCount: 0,
      completionPercentage: 0,
      estimatedMinutes: 0,

      setHabits: (data) => set(data),

      toggleHabit: (habitId) =>
        set((state) => {
          const habits = state.habits.map((h) =>
            h.id === habitId ? { ...h, isCompletedToday: !h.isCompletedToday } : h
          );
          const completedCount = habits.filter((h) => h.isCompletedToday).length;
          const totalCount = habits.length;
          return {
            habits,
            completedCount,
            totalCount,
            completionPercentage: totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0,
          };
        }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: "habit-store",
      // Solo persistir los datos de hábitos, no estados de carga/error
      partialize: (state) => ({
        habits: state.habits,
        completedCount: state.completedCount,
        totalCount: state.totalCount,
        completionPercentage: state.completionPercentage,
        estimatedMinutes: state.estimatedMinutes,
      }),
    }
  )
);
