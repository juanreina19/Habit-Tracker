"use client";

import { useEffect, useCallback, useRef } from "react";
import { useHabitStore } from "../store/habitStore";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { AchievementSupabaseRepository } from "@/modules/achievements/infrastructure/supabase/AchievementSupabaseRepository";
import { CheckAndUnlockAchievementsUseCase } from "@/modules/achievements/domain/use-cases/CheckAndUnlockAchievementsUseCase";
import { GetTodayHabitsUseCase } from "../../domain/use-cases/GetTodayHabitsUseCase";
import { UncompleteHabitUseCase } from "../../domain/use-cases/UncompleteHabitUseCase";
import { CalculateStreakUseCase } from "../../domain/use-cases/CalculateStreakUseCase";
import { UseFreezeUseCase } from "../../domain/use-cases/UseFreezeUseCase";
import { today } from "@/shared/lib/utils/dates";
import type { UUID } from "@/shared/types/database.types";

// Actualiza el store de hábitos de hoy desde cualquier contexto (sin montar el hook)
export async function refreshTodayHabitsInStore(userId: UUID): Promise<void> {
  try {
    const client = createClient();
    const repo = new HabitSupabaseRepository(client);
    const result = await new GetTodayHabitsUseCase(repo).execute(userId);
    useHabitStore.getState().setHabits(result);
    useHabitStore.getState().bumpVersion();
  } catch {
    // best-effort — no lanza error
  }
}

export function useHabits(userId: UUID) {
  const { setHabits, toggleHabit, setLoading, setError, habits, isLoading, error,
    completedCount, totalCount, completionPercentage, estimatedMinutes, dataVersion } = useHabitStore();

  const getRepository = useCallback(() => {
    const client = createClient();
    return new HabitSupabaseRepository(client);
  }, []);

  const fetchHabits = useCallback(async () => {
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

  // Ref estable para fetchHabits — permite llamarlo desde closures sin recrear suscripciones
  const fetchHabitsRef = useRef(fetchHabits);
  useEffect(() => { fetchHabitsRef.current = fetchHabits; });

  // IDs de hábitos con desmarco pendiente (timer activo de 3s).
  // El Realtime bloquea refetches mientras haya pendientes para evitar
  // que la DB (que aún tiene isCompletedToday=true) revierta el estado optimista.
  const pendingUnchecks = useRef(new Set<UUID>());

  // ─── Complete ───────────────────────────────────────────────────────────────
  const completeHabit = useCallback(
    async (habitId: UUID) => {
      toggleHabit(habitId); // optimista: isCompletedToday = true

      const repo = getRepository();

      // Paso 1: insertar log — si falla, revertir toggle y salir
      try {
        await repo.logCompletion(habitId, userId, today());
      } catch (err) {
        toggleHabit(habitId); // revertir: el log no se guardó
        setError(err instanceof Error ? err.message : "Error al completar hábito");
        return;
      }

      // Paso 2: calcular racha — no crítico, el log ya está en DB
      // Si falla, Realtime / fetchHabits sincronizará el estado correcto
      try {
        await new CalculateStreakUseCase(repo).execute(habitId, userId);
      } catch {
        // best-effort: no revertir el toggle
      }

      if ("vibrate" in navigator) navigator.vibrate(10);

      // Logros (fire-and-forget)
      const client = createClient();
      void new CheckAndUnlockAchievementsUseCase(
        repo,
        new AchievementSupabaseRepository(client)
      ).execute(userId).catch(() => {});
    },
    [userId, getRepository, toggleHabit, setError]
  );

  // ─── Uncheck (con undo, timer de 3s) ────────────────────────────────────────
  const uncheckHabit = useCallback(
    (habitId: UUID): (() => void) => {
      toggleHabit(habitId); // optimista: isCompletedToday = false
      // maxStreak en TodayView solo cuenta hábitos con isCompletedToday=true,
      // así que el 🔥 desaparece de inmediato sin tocar el store de streak.
      pendingUnchecks.current.add(habitId);

      let cancelled = false;
      const timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const repo = getRepository();
          const calculateStreak = new CalculateStreakUseCase(repo);
          await new UncompleteHabitUseCase(repo, calculateStreak).execute(habitId, userId, today());
        } catch (err) {
          if (!cancelled) {
            toggleHabit(habitId); // revertir si falla API
            setError(err instanceof Error ? err.message : "Error al desmarcar hábito");
          }
        } finally {
          pendingUnchecks.current.delete(habitId);
          if (!cancelled) fetchHabitsRef.current(); // confirmar racha real desde DB
        }
      }, 3000);

      return () => {
        // Undo: revertir estado optimista y restaurar racha real desde DB
        cancelled = true;
        clearTimeout(timer);
        pendingUnchecks.current.delete(habitId);
        toggleHabit(habitId); // isCompletedToday = true de nuevo
        fetchHabitsRef.current(); // restaurar streak correcto desde DB
      };
    },
    [userId, getRepository, toggleHabit, setError]
  );

  // ─── Freeze ─────────────────────────────────────────────────────────────────
  const freezeHabit = useCallback(
    async (habitId: UUID): Promise<void> => {
      const repo = getRepository();
      await new UseFreezeUseCase(repo).execute(habitId, userId);
      await fetchHabits();
    },
    [userId, getRepository, fetchHabits]
  );

  // ─── Fetch inicial y reactividad por dataVersion ─────────────────────────────
  useEffect(() => {
    fetchHabits();
  }, [fetchHabits, dataVersion]);

  // ─── Supabase Realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    const client = createClient();
    let debounceTimer: ReturnType<typeof setTimeout>;

    const debouncedFetch = () => {
      // No refetch si hay un desmarco pendiente: la DB aún tiene isCompletedToday=true
      // y sobreescribiría el estado optimista, revirtiendo la UI en el dispositivo origen.
      if (pendingUnchecks.current.size > 0) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchHabitsRef.current(), 300);
    };

    const channel = client
      .channel(`today-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "habits" },     debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "habit_logs" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "streaks" },    debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      client.removeChannel(channel);
    };
  }, [userId]);

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
