"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { FocusSessionSupabaseRepository } from "../../infrastructure/supabase/FocusSessionSupabaseRepository";
import { RecordFocusSessionUseCase } from "../../domain/use-cases/RecordFocusSessionUseCase";
import type { TaskWithStatus } from "../../domain/entities/Task";
import type { FocusSessionStatus } from "../../domain/entities/FocusSession";
import type { UUID } from "@/shared/types/database.types";
import {
  type ActiveFocusSession,
  readActiveSession,
  writeActiveSession,
  clearActiveSession,
  isStalePausedSession,
  getElapsedSec,
} from "../lib/focusSessionStorage";

export function useFocusSession(userId: UUID) {
  const [active, setActive] = useState<ActiveFocusSession | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishingRef = useRef(false);

  const getRepo = useCallback(() => new FocusSessionSupabaseRepository(createClient()), []);

  const loadActive = useCallback(() => {
    const session = readActiveSession();
    if (!session || session.userId !== userId) { setActive(null); return; }
    if (isStalePausedSession(session)) { clearActiveSession(); setActive(null); return; }
    setActive(session);
  }, [userId]);

  useEffect(() => { loadActive(); }, [loadActive]);

  // Sincroniza `active` entre pestañas (ej. finish() en otra pestaña limpia el blob).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "focus_active_session") loadActive();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadActive]);

  const start = useCallback((task: TaskWithStatus) => {
    if (task.focusDurationMin === null) return;
    if (readActiveSession() !== null) return; // localStorage es la fuente de verdad: solo una sesión activa a la vez

    const session: ActiveFocusSession = {
      userId,
      clientSessionId: crypto.randomUUID(),
      taskId: task.id,
      taskTitle: task.title,
      durationMin: task.focusDurationMin,
      startedAt: new Date().toISOString(),
      pausedAt: null,
      accumulatedSec: 0,
      continuedPastGoal: false,
    };
    writeActiveSession(session);
    setActive(session);
  }, [userId]);

  const pause = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.pausedAt !== null) return prev;
      const next: ActiveFocusSession = {
        ...prev,
        accumulatedSec: getElapsedSec(prev),
        pausedAt: new Date().toISOString(),
      };
      writeActiveSession(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.pausedAt === null) return prev;
      const next: ActiveFocusSession = { ...prev, startedAt: new Date().toISOString(), pausedAt: null };
      writeActiveSession(next);
      return next;
    });
  }, []);

  const continueWorking = useCallback(() => {
    setActive((prev) => {
      if (!prev) return prev;
      const next: ActiveFocusSession = { ...prev, continuedPastGoal: true };
      writeActiveSession(next);
      return next;
    });
  }, []);

  const discard = useCallback(() => {
    clearActiveSession();
    setActive(null);
  }, []);

  /** Persiste la sesión activa (si corresponde) y limpia el storage. Idempotente. */
  const finish = useCallback(async (): Promise<{ recorded: boolean }> => {
    if (finishingRef.current) return { recorded: false };

    // Releer storage: si otra pestaña ya finalizó esta sesión, no-op.
    const current = readActiveSession();
    if (!current) {
      setActive(null);
      return { recorded: false };
    }

    finishingRef.current = true;
    setIsFinishing(true);
    try {
      const elapsedSec = Math.floor(getElapsedSec(current));
      if (elapsedSec < 60) {
        clearActiveSession();
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

      clearActiveSession();
      setActive(null);
      return { recorded: true };
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
    }
  }, [userId, getRepo]);

  return { active, start, pause, resume, continueWorking, finish, discard, isFinishing };
}
