import type { ISOTimestamp, UUID } from "@/shared/types/database.types";

export const MAX_SEGMENT_SEC = 8 * 60 * 60; // 8h
export const MAX_SESSION_SEC = 24 * 60 * 60; // 24h
const STALE_PAUSED_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type FocusPhase = 'focus' | 'short_break' | 'long_break';

export const DEFAULT_FOCUS_DURATION_MIN = 25;
export const DEFAULT_SHORT_BREAK_MIN = 5;
export const DEFAULT_LONG_BREAK_MIN = 15;
export const DEFAULT_LONG_BREAK_INTERVAL = 4;
export const DEFAULT_AUTO_START_SHORT_BREAK = false;
export const DEFAULT_AUTO_START_LONG_BREAK = false;

export function normalizePhase(phase: string | null): FocusPhase {
  return phase === 'short_break' || phase === 'long_break' ? phase : 'focus';
}

/** Sesión global de Focus Mode — una por usuario, sin historial. */
export interface FocusModeSession {
  userId: UUID;
  clientSessionId: UUID;
  taskIds: UUID[];
  phase: FocusPhase;
  sessionIndex: number;
  focusDurationMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakInterval: number;
  autoStartShortBreak: boolean;
  autoStartLongBreak: boolean;
  durationMin: number;        // duración de la fase actual
  startedAt: ISOTimestamp;
  pausedAt: ISOTimestamp | null;
  accumulatedSec: number;
}

export function isStalePausedSession(session: FocusModeSession): boolean {
  return (
    session.pausedAt !== null &&
    Date.now() - new Date(session.pausedAt).getTime() > STALE_PAUSED_MS
  );
}

export function getElapsedSec(session: FocusModeSession): number {
  if (session.pausedAt !== null) {
    return Math.min(session.accumulatedSec, MAX_SESSION_SEC);
  }
  const rawDelta = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
  const cappedDelta = Math.min(Math.max(0, rawDelta), MAX_SEGMENT_SEC);
  return Math.min(session.accumulatedSec + cappedDelta, MAX_SESSION_SEC);
}
