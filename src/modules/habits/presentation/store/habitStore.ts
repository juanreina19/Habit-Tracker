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
  dataVersion: number;

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
  bumpVersion: () => void;
}

// ─── [HT] Helpers de diagnóstico ─────────────────────────────────────────────
const htSnap = (habits: HabitWithStatus[]) =>
  habits.map((h) => `${h.id.slice(0, 6)}=${h.isCompletedToday ? "✓" : "✗"}`).join(" ");

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
      dataVersion: 0,

      setHabits: (data) => {
        // [HT] LOG — quién escribe al store y qué valor trae
        console.log(`[HT STORE:setHabits] ${Date.now()} habits=[${htSnap(data.habits)}]`);
        set(data);
      },

      bumpVersion: () =>
        set((s) => {
          // [HT] LOG — cada invalidación de caché
          console.log(`[HT STORE:bump] ${Date.now()} v=${s.dataVersion} → ${s.dataVersion + 1}`);
          return { dataVersion: s.dataVersion + 1 };
        }),

      toggleHabit: (habitId) =>
        set((state) => {
          const habit = state.habits.find((h) => h.id === habitId);
          // [HT] LOG — actualización optimista
          console.log(
            `[HT STORE:toggle] ${Date.now()} id=${habitId.slice(0, 6)} ${habit?.isCompletedToday ? "✓→✗" : "✗→✓"}`
          );
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
