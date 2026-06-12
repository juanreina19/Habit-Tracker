"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { FocusSessionSupabaseRepository } from "../../infrastructure/supabase/FocusSessionSupabaseRepository";
import { ActiveFocusSessionSupabaseRepository } from "../../infrastructure/supabase/ActiveFocusSessionSupabaseRepository";
import { RecordFocusSessionUseCase } from "../../domain/use-cases/RecordFocusSessionUseCase";
import type { TaskWithStatus } from "../../domain/entities/Task";
import {
  resolveSessionsGoal,
  resolveShortBreakMin,
  resolveLongBreakMin,
  resolveLongBreakInterval,
  resolveAutoStartNext,
} from "../../domain/entities/Task";
import type { FocusSessionStatus } from "../../domain/entities/FocusSession";
import type { UUID } from "@/shared/types/database.types";
import {
  type ActiveFocusSession,
  isStalePausedSession,
  getElapsedSec,
} from "../../domain/entities/ActiveFocusSession";

export function useFocusSession(userId: UUID) {
  const [active, setActive] = useState<ActiveFocusSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishingRef = useRef(false);
  const activeRef = useRef<ActiveFocusSession | null>(null);
  useEffect(() => { activeRef.current = active; }, [active]);

  const getActiveRepo = useCallback(() => new ActiveFocusSessionSupabaseRepository(createClient()), []);
  const getRepo = useCallback(() => new FocusSessionSupabaseRepository(createClient()), []);

  const loadActive = useCallback(async () => {
    try {
      const session = await getActiveRepo().get(userId);
      if (session && isStalePausedSession(session)) {
        await getActiveRepo().clear(userId);
        setActive(null);
        return;
      }
      setActive(session);
    } catch {
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, [userId, getActiveRepo]);

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

    const ch = client.channel(`active-focus-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "active_focus_sessions" }, refetch)
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

  const start = useCallback(async (task: TaskWithStatus) => {
    if (task.focusDurationMin === null) return;
    if (activeRef.current !== null) return; // ya hay una sesión activa (propia o de otro dispositivo)

    const session: ActiveFocusSession = {
      userId,
      clientSessionId: crypto.randomUUID(),
      taskId: task.id,
      taskTitle: task.title,
      durationMin: task.focusDurationMin,
      startedAt: new Date().toISOString(),
      pausedAt: new Date().toISOString(), // nace pausada: el usuario debe presionar Play para iniciar
      accumulatedSec: 0,
      continuedPastGoal: false,
      phase: 'focus',
      sessionIndex: 1,
      sessionsGoal: resolveSessionsGoal(task),
      shortBreakMin: resolveShortBreakMin(task),
      longBreakMin: resolveLongBreakMin(task),
      longBreakInterval: resolveLongBreakInterval(task),
      autoStartNext: resolveAutoStartNext(task),
      focusDurationMin: task.focusDurationMin,
    };

    try {
      const result = await getActiveRepo().start(userId, session);
      setActive(result);
    } catch {
      // Si falla la persistencia, Realtime/loadActive en el próximo intento reflejará el estado real.
    }
  }, [userId, getActiveRepo]);

  const pause = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.pausedAt !== null) return prev;
      const next: ActiveFocusSession = {
        ...prev,
        // accumulated_sec es `int` en la DB: redondear, getElapsedSec() devuelve segundos con decimales.
        accumulatedSec: Math.floor(getElapsedSec(prev)),
        pausedAt: new Date().toISOString(),
      };
      getActiveRepo().update(userId, { accumulatedSec: next.accumulatedSec, pausedAt: next.pausedAt }).catch(() => {});
      return next;
    });
  }, [userId, getActiveRepo]);

  const resume = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.pausedAt === null) return prev;
      const next: ActiveFocusSession = { ...prev, startedAt: new Date().toISOString(), pausedAt: null };
      getActiveRepo().update(userId, { startedAt: next.startedAt, pausedAt: null }).catch(() => {});
      return next;
    });
  }, [userId, getActiveRepo]);

  const continueWorking = useCallback(() => {
    setActive((prev) => {
      if (!prev) return prev;
      const next: ActiveFocusSession = { ...prev, continuedPastGoal: true };
      getActiveRepo().update(userId, { continuedPastGoal: true }).catch(() => {});
      return next;
    });
  }, [userId, getActiveRepo]);

  const discard = useCallback(() => {
    setActive(null);
    getActiveRepo().clear(userId).catch(() => {});
  }, [userId, getActiveRepo]);

  /** Avanza a la siguiente fase del ciclo (foco→descanso o descanso→foco). Idempotente. */
  const advancePhase = useCallback(async () => {
    // Releer la fuente de verdad: si otro dispositivo ya avanzó esta sesión, solo sincronizamos.
    const current = await getActiveRepo().get(userId);
    if (!current) {
      setActive(null);
      return;
    }

    const local = activeRef.current;
    if (local && (current.phase !== local.phase || current.sessionIndex !== local.sessionIndex)) {
      setActive(current);
      return;
    }

    if (current.phase === 'focus') {
      const elapsedSec = Math.floor(getElapsedSec(current));
      if (elapsedSec >= 60) {
        const status: FocusSessionStatus =
          elapsedSec >= current.durationMin * 60 ? "completed" : "abandoned";
        const endedAt = new Date();
        const startedAt = new Date(endedAt.getTime() - elapsedSec * 1000);

        try {
          await new RecordFocusSessionUseCase(getRepo()).execute(userId, {
            taskId: current.taskId,
            durationMin: current.durationMin,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            elapsedSec,
            status,
          });
        } catch {
          // Si falla el registro, el ciclo continúa de todas formas.
        }
      }
    }

    const now = new Date().toISOString();
    let next: ActiveFocusSession;

    if (current.phase === 'focus') {
      const isLongBreak = current.sessionIndex % current.longBreakInterval === 0;
      next = {
        ...current,
        phase: isLongBreak ? 'long_break' : 'short_break',
        durationMin: isLongBreak ? current.longBreakMin : current.shortBreakMin,
        accumulatedSec: 0,
        startedAt: now,
        pausedAt: current.autoStartNext ? null : now,
      };
    } else {
      next = {
        ...current,
        phase: 'focus',
        sessionIndex: current.sessionIndex + 1,
        durationMin: current.focusDurationMin,
        accumulatedSec: 0,
        startedAt: now,
        pausedAt: current.autoStartNext ? null : now,
      };
    }

    try {
      await getActiveRepo().update(userId, {
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
  }, [userId, getRepo, getActiveRepo]);

  // Avance automático de fase: cada segundo, comprueba si la fase actual llegó a su meta.
  useEffect(() => {
    const id = setInterval(() => {
      const current = activeRef.current;
      if (!current) return;
      const elapsedSec = getElapsedSec(current);
      if (elapsedSec < current.durationMin * 60) return;

      const isFinalFocusGoal = current.phase === 'focus' && current.sessionIndex >= current.sessionsGoal;
      if (isFinalFocusGoal || current.continuedPastGoal) return; // lo maneja la pantalla "🎉"

      advancePhase();
    }, 1000);
    return () => clearInterval(id);
  }, [advancePhase]);

  /** Persiste la sesión activa (si corresponde) y la limpia. Idempotente. */
  const finish = useCallback(async (): Promise<{ recorded: boolean }> => {
    if (finishingRef.current) return { recorded: false };

    // Releer la fuente de verdad: si otro dispositivo ya finalizó esta sesión, no-op.
    const current = await getActiveRepo().get(userId);
    if (!current) {
      setActive(null);
      return { recorded: false };
    }

    finishingRef.current = true;
    setIsFinishing(true);
    try {
      const elapsedSec = Math.floor(getElapsedSec(current));
      if (elapsedSec < 60) {
        await getActiveRepo().clear(userId);
        setActive(null);
        return { recorded: false };
      }

      if (current.phase !== 'focus') {
        // Los descansos nunca se registran en focus_sessions.
        await getActiveRepo().clear(userId);
        setActive(null);
        return { recorded: false };
      }

      const status: FocusSessionStatus =
        elapsedSec >= current.durationMin * 60 ? "completed" : "abandoned";

      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - elapsedSec * 1000);

      await new RecordFocusSessionUseCase(getRepo()).execute(userId, {
        taskId: current.taskId,
        durationMin: current.durationMin,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        elapsedSec,
        status,
      });

      await getActiveRepo().clear(userId);
      setActive(null);
      return { recorded: true };
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
    }
  }, [userId, getRepo, getActiveRepo]);

  return { active, loading, start, pause, resume, continueWorking, finish, discard, isFinishing, advancePhase };
}
