"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { FocusSessionSupabaseRepository } from "../../infrastructure/supabase/FocusSessionSupabaseRepository";
import { ActiveFocusSessionSupabaseRepository } from "../../infrastructure/supabase/ActiveFocusSessionSupabaseRepository";
import { RecordFocusSessionUseCase } from "../../domain/use-cases/RecordFocusSessionUseCase";
import type { TaskWithStatus } from "../../domain/entities/Task";
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

    return () => { clearTimeout(debounce); client.removeChannel(ch); };
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
        accumulatedSec: getElapsedSec(prev),
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

  return { active, loading, start, pause, resume, continueWorking, finish, discard, isFinishing };
}
