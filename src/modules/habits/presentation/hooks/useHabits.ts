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

// ─── [HT] Helper de snapshot ─────────────────────────────────────────────────
const htSnap = (habits: { id: string; isCompletedToday: boolean }[]) =>
  habits.map((h) => `${h.id.slice(0, 6)}=${h.isCompletedToday ? "✓" : "✗"}`).join(" ");

// Actualiza el store de hábitos de hoy desde cualquier contexto (sin montar el hook)
export async function refreshTodayHabitsInStore(userId: UUID): Promise<void> {
  try {
    const client = createClient();
    const repo = new HabitSupabaseRepository(client);
    const result = await new GetTodayHabitsUseCase(repo).execute(userId);
    // [HT] LOG — esta función bypasea el generation counter
    console.log(`[HT refreshStore] ${Date.now()} habits=[${htSnap(result.habits)}]`);
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

  // [HT] Subscribe al store para detectar CUALQUIER escritura sobre isCompletedToday
  useEffect(() => {
    const unsub = useHabitStore.subscribe((state, prev) => {
      const changed = state.habits.filter((h) => {
        const p = prev.habits.find((ph) => ph.id === h.id);
        return p && p.isCompletedToday !== h.isCompletedToday;
      });
      if (changed.length > 0) {
        console.log(
          `[HT SUB:store] ${Date.now()} isCompletedToday cambió:`,
          changed.map((h) => `${h.id.slice(0, 6)}:${h.isCompletedToday ? "✓" : "✗"}`).join(" ")
        );
      }
    });
    return unsub;
  }, []);

  const fetchHabits = useCallback(async (reason = "dataVersion") => {
    const generation = ++fetchGeneration.current;
    const tsStart = Date.now();
    // [HT] LOG — inicio de fetch
    console.log(`[HT FETCH:start] ${tsStart} gen=${generation} reason=${reason} pendingC=${pendingCompletes.current.size} pendingU=${pendingUnchecks.current.size}`);

    const hasCache = useHabitStore.getState().habits.length > 0;
    if (!hasCache) setLoading(true);
    setError(null);
    try {
      const repo = getRepository();
      const result = await new GetTodayHabitsUseCase(repo).execute(userId);
      const tsEnd = Date.now();

      if (fetchGeneration.current !== generation) {
        // [HT] LOG — descartado por generation counter
        console.log(`[HT FETCH:discard-gen] ${tsEnd} gen=${generation} current=${fetchGeneration.current} reason=${reason} habits=[${htSnap(result.habits)}]`);
        return;
      }
      if (pendingCompletes.current.size > 0 || pendingUnchecks.current.size > 0) {
        // [HT] LOG — descartado por pending guard
        console.log(`[HT FETCH:discard-pending] ${tsEnd} gen=${generation} pendingC=${pendingCompletes.current.size} pendingU=${pendingUnchecks.current.size} habits=[${htSnap(result.habits)}]`);
        return;
      }
      // [HT] LOG — aplicado al store
      console.log(`[HT FETCH:apply] ${tsEnd} gen=${generation} reason=${reason} dt=${tsEnd - tsStart}ms habits=[${htSnap(result.habits)}]`);
      setHabits(result);
    } catch (err) {
      if (fetchGeneration.current === generation) {
        setError(err instanceof Error ? err.message : "Error al cargar hábitos");
      }
    } finally {
      if (fetchGeneration.current === generation) setLoading(false);
    }
  }, [userId, getRepository, setHabits, setLoading, setError]);

  // Ref estable para fetchHabits — permite llamarlo desde closures sin recrear suscripciones
  const fetchHabitsRef = useRef(fetchHabits);
  useEffect(() => { fetchHabitsRef.current = fetchHabits; });

  // IDs con operaciones optimistas en vuelo. Mientras haya pendientes, cualquier
  // fetchHabits() que regrese con datos de DB descarta el resultado para no
  // sobreescribir el estado optimista (evita el flash/flicker visual).
  const pendingUnchecks = useRef(new Set<UUID>());
  const pendingCompletes = useRef(new Set<UUID>());

  // Generación del fetch. Solo el fetch más reciente puede actualizar el store;
  // cualquier invocación anterior descarta su resultado (race condition definitivo).
  const fetchGeneration = useRef(0);

  // ─── Complete ───────────────────────────────────────────────────────────────
  const completeHabit = useCallback(
    async (habitId: UUID) => {
      // [HT] LOG — inicio de operación de completar
      console.log(`[HT COMPLETE:start] ${Date.now()} id=${habitId.slice(0, 6)}`);

      toggleHabit(habitId); // optimista: isCompletedToday = true
      pendingCompletes.current.add(habitId); // bloquear refetches mientras opera

      const repo = getRepository();

      // Paso 1: insertar log — si falla, revertir toggle y salir
      try {
        await repo.logCompletion(habitId, userId, today());
      } catch (err) {
        pendingCompletes.current.delete(habitId);
        toggleHabit(habitId); // revertir: el log no se guardó
        setError(err instanceof Error ? err.message : "Error al completar hábito");
        return;
      }

      // Paso 2: calcular racha — no crítico, el log ya está en DB
      try {
        await new CalculateStreakUseCase(repo).execute(habitId, userId);
      } catch {
        // best-effort: no revertir el toggle
      }

      // Desbloquear refetches y notificar a useWeekly (actualiza racha en calendario)
      pendingCompletes.current.delete(habitId);
      // [HT] LOG — operación completada, pendingCompletes ya vaciado
      console.log(`[HT COMPLETE:done] ${Date.now()} id=${habitId.slice(0, 6)} pendingC=${pendingCompletes.current.size}`);
      useHabitStore.getState().bumpVersion();

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
      // [HT] LOG — inicio de desmarcar
      console.log(`[HT UNCHECK:start] ${Date.now()} id=${habitId.slice(0, 6)}`);

      toggleHabit(habitId); // optimista: isCompletedToday = false
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
          // [HT] LOG — timer de uncheck completado
          console.log(`[HT UNCHECK:committed] ${Date.now()} id=${habitId.slice(0, 6)}`);
          if (!cancelled) useHabitStore.getState().bumpVersion();
        }
      }, 3000);

      return () => {
        // Undo: revertir estado optimista y resincronizar desde DB
        cancelled = true;
        clearTimeout(timer);
        pendingUnchecks.current.delete(habitId);
        // [HT] LOG — undo presionado
        console.log(`[HT UNCHECK:undo] ${Date.now()} id=${habitId.slice(0, 6)}`);
        toggleHabit(habitId); // isCompletedToday = true de nuevo
        useHabitStore.getState().bumpVersion();
      };
    },
    [userId, getRepository, toggleHabit, setError]
  );

  // ─── Freeze ─────────────────────────────────────────────────────────────────
  const freezeHabit = useCallback(
    async (habitId: UUID): Promise<void> => {
      const repo = getRepository();
      await new UseFreezeUseCase(repo).execute(habitId, userId);
      await fetchHabits("freeze");
    },
    [userId, getRepository, fetchHabits]
  );

  // ─── Fetch inicial y reactividad por dataVersion ─────────────────────────────
  useEffect(() => {
    fetchHabits("dataVersion");
  }, [fetchHabits, dataVersion]);

  // ─── Supabase Realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    const client = createClient();
    let debounceTimer: ReturnType<typeof setTimeout>;

    const debouncedFetch = (table: string, eventType: string) => {
      const blocked = pendingUnchecks.current.size > 0 || pendingCompletes.current.size > 0;
      // [HT] LOG — evento Realtime recibido
      console.log(
        `[HT REALTIME] ${Date.now()} table=${table} event=${eventType} pendingC=${pendingCompletes.current.size} pendingU=${pendingUnchecks.current.size} blocked=${blocked}`
      );
      if (blocked) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchHabitsRef.current("realtime"), 300);
    };

    const channel = client
      .channel(`today-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "habits" },
        (p) => debouncedFetch("habits", p.eventType))
      .on("postgres_changes", { event: "*", schema: "public", table: "habit_logs" },
        (p) => debouncedFetch("habit_logs", p.eventType))
      .on("postgres_changes", { event: "*", schema: "public", table: "streaks" },
        (p) => debouncedFetch("streaks", p.eventType))
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
