"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { FocusModeSessionSupabaseRepository } from "../../infrastructure/supabase/FocusModeSessionSupabaseRepository";
import {
  isStalePausedSession,
  getElapsedSec,
  DEFAULT_FOCUS_DURATION_MIN,
  DEFAULT_SHORT_BREAK_MIN,
  DEFAULT_LONG_BREAK_MIN,
  DEFAULT_LONG_BREAK_INTERVAL,
  DEFAULT_AUTO_START_SHORT_BREAK,
  DEFAULT_AUTO_START_LONG_BREAK,
} from "../../domain/entities/FocusModeSession";
import type { FocusModeSession } from "../../domain/entities/FocusModeSession";
import type { UUID } from "@/shared/types/database.types";

export type FocusModeSettingsInput = Partial<Pick<FocusModeSession,
  "focusDurationMin" | "shortBreakMin" | "longBreakMin" | "longBreakInterval" |
  "autoStartShortBreak" | "autoStartLongBreak"
>>;

export function useFocusMode(userId: UUID) {
  const [active, setActive] = useState<FocusModeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef<FocusModeSession | null>(null);
  useEffect(() => { activeRef.current = active; }, [active]);
  // El intervalo de abajo dispara advancePhase() una vez por segundo mientras el tiempo
  // esté agotado; advancePhase es async (lee y escribe en Supabase) y activeRef no se
  // actualiza hasta que el primer llamado resuelve. Sin este guard, un round-trip de red
  // >1s produce llamadas superpuestas que hacen avanzar la fase dos veces seguidas
  // (foco→break→foco), lo que se percibe como "el timer se reinicia" en vez de pasar al break.
  const advancingRef = useRef(false);

  const getRepo = useCallback(() => new FocusModeSessionSupabaseRepository(createClient()), []);

  const loadActive = useCallback(async () => {
    try {
      const session = await getRepo().get(userId);
      if (session && isStalePausedSession(session)) {
        await getRepo().clear(userId);
        setActive(null);
        return;
      }
      setActive(session);
    } catch {
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, [userId, getRepo]);

  const loadActiveRef = useRef(loadActive);
  useEffect(() => { loadActiveRef.current = loadActive; });

  useEffect(() => { loadActive(); }, [loadActive]);

  // Realtime: la sesión activa de cualquier dispositivo (sin filtro user_id, ver useTodayTasks.ts).
  useEffect(() => {
    const client = createClient();
    let debounce: ReturnType<typeof setTimeout>;
    const refetch = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => loadActiveRef.current(), 300);
    };

    const ch = client.channel(`focus-mode-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "focus_mode_sessions" }, refetch)
      .subscribe();

    // En segundo plano (móvil bloqueado/pestaña no visible) el websocket de Realtime se
    // suspende y se pierden eventos. Al volver a primer plano, refrescamos para ponernos al día.
    const onVisible = () => {
      if (document.visibilityState === "visible") loadActiveRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(debounce);
      client.removeChannel(ch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const start = useCallback(async (taskIds: UUID[], settings?: FocusModeSettingsInput) => {
    if (activeRef.current !== null) return; // ya hay una sesión activa (propia o de otro dispositivo)

    const focusDurationMin = settings?.focusDurationMin ?? DEFAULT_FOCUS_DURATION_MIN;
    const now = new Date().toISOString();

    const session: FocusModeSession = {
      userId,
      clientSessionId: crypto.randomUUID(),
      taskIds,
      phase: 'focus',
      sessionIndex: 1,
      focusDurationMin,
      shortBreakMin: settings?.shortBreakMin ?? DEFAULT_SHORT_BREAK_MIN,
      longBreakMin: settings?.longBreakMin ?? DEFAULT_LONG_BREAK_MIN,
      longBreakInterval: settings?.longBreakInterval ?? DEFAULT_LONG_BREAK_INTERVAL,
      autoStartShortBreak: settings?.autoStartShortBreak ?? DEFAULT_AUTO_START_SHORT_BREAK,
      autoStartLongBreak: settings?.autoStartLongBreak ?? DEFAULT_AUTO_START_LONG_BREAK,
      durationMin: focusDurationMin,
      startedAt: now,
      pausedAt: now, // nace pausada: el usuario debe presionar Play para iniciar
      accumulatedSec: 0,
    };

    try {
      const result = await getRepo().start(userId, session);
      setActive(result);
    } catch {
      // Si falla la persistencia, Realtime/loadActive en el próximo intento reflejará el estado real.
    }
  }, [userId, getRepo]);

  const pause = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.pausedAt !== null) return prev;
      const next: FocusModeSession = {
        ...prev,
        // accumulated_sec es `int` en la DB: redondear, getElapsedSec() devuelve segundos con decimales.
        accumulatedSec: Math.floor(getElapsedSec(prev)),
        pausedAt: new Date().toISOString(),
      };
      getRepo().update(userId, { accumulatedSec: next.accumulatedSec, pausedAt: next.pausedAt }).catch(() => {});
      return next;
    });
  }, [userId, getRepo]);

  const resume = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.pausedAt === null) return prev;
      const next: FocusModeSession = { ...prev, startedAt: new Date().toISOString(), pausedAt: null };
      getRepo().update(userId, { startedAt: next.startedAt, pausedAt: null }).catch(() => {});
      return next;
    });
  }, [userId, getRepo]);

  const discard = useCallback(() => {
    setActive(null);
    getRepo().clear(userId).catch(() => {});
  }, [userId, getRepo]);

  /** Aplica cambios de configuración del ciclo a la sesión activa, sin pausarla ni reiniciarla. */
  const updateActiveConfig = useCallback((patch: FocusModeSettingsInput) => {
    setActive((prev) => {
      if (!prev) return prev;

      const next: FocusModeSession = { ...prev, ...patch };

      // Si la fase actual es justo aquella cuya duración cambió, reflejarlo de inmediato en el timer en curso.
      if (prev.phase === 'focus' && patch.focusDurationMin !== undefined) {
        next.durationMin = patch.focusDurationMin;
      } else if (prev.phase === 'short_break' && patch.shortBreakMin !== undefined) {
        next.durationMin = patch.shortBreakMin;
      } else if (prev.phase === 'long_break' && patch.longBreakMin !== undefined) {
        next.durationMin = patch.longBreakMin;
      }

      const updatePatch: FocusModeSettingsInput & { durationMin?: number } = { ...patch };
      if (next.durationMin !== prev.durationMin) updatePatch.durationMin = next.durationMin;

      getRepo().update(userId, updatePatch).catch(() => {});
      return next;
    });
  }, [userId, getRepo]);

  /** Avanza a la siguiente fase del ciclo (foco→descanso o descanso→foco). Se repite indefinidamente. */
  const advancePhase = useCallback(async () => {
    // Reentrancia: si ya hay un avance en curso (disparado por el intervalo o por Skip
    // manual), no iniciar uno segundo — ver comentario junto a advancingRef.
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      // Releer la fuente de verdad: si otro dispositivo ya avanzó esta sesión, solo sincronizamos.
      const current = await getRepo().get(userId);
      if (!current) {
        setActive(null);
        return;
      }

      const local = activeRef.current;
      if (local && (current.phase !== local.phase || current.sessionIndex !== local.sessionIndex)) {
        setActive(current);
        return;
      }

      const now = new Date().toISOString();
      let next: FocusModeSession;

      if (current.phase === 'focus') {
        const isLongBreak = current.sessionIndex % current.longBreakInterval === 0;
        const autoStart = isLongBreak ? current.autoStartLongBreak : current.autoStartShortBreak;
        next = {
          ...current,
          phase: isLongBreak ? 'long_break' : 'short_break',
          durationMin: isLongBreak ? current.longBreakMin : current.shortBreakMin,
          accumulatedSec: 0,
          startedAt: now,
          pausedAt: autoStart ? null : now,
        };
      } else {
        const autoStart = current.phase === 'long_break' ? current.autoStartLongBreak : current.autoStartShortBreak;
        next = {
          ...current,
          phase: 'focus',
          sessionIndex: current.sessionIndex + 1,
          durationMin: current.focusDurationMin,
          accumulatedSec: 0,
          startedAt: now,
          pausedAt: autoStart ? null : now,
        };
      }

      try {
        await getRepo().update(userId, {
          phase: next.phase,
          sessionIndex: next.sessionIndex,
          durationMin: next.durationMin,
          accumulatedSec: next.accumulatedSec,
          startedAt: next.startedAt,
          pausedAt: next.pausedAt,
        });
        setActive(next);
      } catch {
        // Realtime/loadActive reflejará el estado real en el próximo refresco.
      }
    } finally {
      advancingRef.current = false;
    }
  }, [userId, getRepo]);

  // Avance automático de fase: cada segundo, comprueba si la fase actual llegó a su duración.
  useEffect(() => {
    const id = setInterval(() => {
      const current = activeRef.current;
      if (!current) return;
      if (current.pausedAt !== null) return;
      const elapsedSec = getElapsedSec(current);
      if (elapsedSec < current.durationMin * 60) return;
      advancePhase();
    }, 1000);
    return () => clearInterval(id);
  }, [advancePhase]);

  const resetTimer = useCallback(() => {
    setActive((prev) => {
      if (!prev) return prev;
      const next: FocusModeSession = { ...prev, accumulatedSec: 0, startedAt: new Date().toISOString() };
      getRepo().update(userId, { accumulatedSec: 0, startedAt: next.startedAt }).catch(() => {});
      return next;
    });
  }, [userId, getRepo]);

  const reorderTasks = useCallback(async (newTaskIds: UUID[]) => {
    const prev = activeRef.current;
    if (!prev) return;
    setActive({ ...prev, taskIds: newTaskIds });
    try {
      await getRepo().update(userId, { taskIds: newTaskIds });
    } catch {
      setActive(prev);
    }
  }, [userId, getRepo]);

  return { active, loading, start, pause, resume, discard, advancePhase, updateActiveConfig, resetTimer, reorderTasks };
}
