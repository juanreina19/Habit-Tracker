import type { ISOTimestamp } from "@/shared/types/database.types";

/** Tope por segmento "corriendo": evita que un salto de reloj hacia adelante
 *  (cambio de zona horaria, reloj manual) inyecte horas de golpe. */
export const MAX_SEGMENT_SEC = 8 * 60 * 60; // 8h

/** Tope total de una sesión: cubre "cerró la laptop y volvió días después". */
export const MAX_SESSION_SEC = 24 * 60 * 60; // 24h

/** Una sesión pausada hace más de esto se considera abandonada al releer. */
const STALE_PAUSED_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

/** Fase del ciclo Pomodoro. */
export type FocusPhase = 'focus' | 'short_break' | 'long_break';

/** Normaliza un valor de `phase` proveniente de la DB (puede ser null en filas pre-migración). */
export function normalizePhase(phase: string | null): FocusPhase {
  return phase === 'short_break' || phase === 'long_break' ? phase : 'focus';
}

/**
 * Sesión de Focus Mode "en curso", sincronizada entre dispositivos vía
 * la tabla active_focus_sessions (una fila por usuario).
 */
export interface ActiveFocusSession {
  userId: string;              // dueño de la sesión
  clientSessionId: string;     // uuid generado por start(); dedup de notificaciones
  taskId: string;
  taskTitle: string;           // snapshot — por si la tarea se borra/renombra
  durationMin: number;         // duración de la FASE ACTUAL (foco o descanso) en minutos
  startedAt: ISOTimestamp;      // inicio del segmento "corriendo" actual
  pausedAt: ISOTimestamp | null; // ISOTimestamp si está pausado, null si corre
  accumulatedSec: number;       // segundos acumulados ANTES del segmento actual
  continuedPastGoal: boolean;   // true = el usuario ya eligió "Continuar trabajando"
  phase: FocusPhase;             // fase actual del ciclo
  sessionIndex: number;          // 1-based: pomodoro actual dentro del ciclo
  sessionsGoal: number;          // snapshot al iniciar
  shortBreakMin: number;         // snapshot al iniciar
  longBreakMin: number;          // snapshot al iniciar
  longBreakInterval: number;     // snapshot al iniciar
  autoStartShortBreak: boolean;  // snapshot, sincronizado en vivo vía updateActiveConfig()
  autoStartLongBreak: boolean;   // snapshot, sincronizado en vivo vía updateActiveConfig()
  focusDurationMin: number;      // snapshot de task.focusDurationMin, inmutable durante el ciclo
}

/** True si la sesión está pausada hace más de 7 días (se trata como abandonada, sin registrar). */
export function isStalePausedSession(session: ActiveFocusSession): boolean {
  return (
    session.pausedAt !== null &&
    Date.now() - new Date(session.pausedAt).getTime() > STALE_PAUSED_MS
  );
}

/**
 * Segundos transcurridos, recalculados desde timestamps (sobrevive reload/cierre).
 * - Pausado: accumulatedSec tal cual.
 * - Corriendo: accumulatedSec + delta del segmento actual, con Math.max(0, …) para
 *   evitar negativos si el reloj se atrasa, y Math.min(…, MAX_SEGMENT_SEC) para
 *   acotar saltos de reloj hacia adelante.
 * El total siempre se acota con MAX_SESSION_SEC.
 */
export function getElapsedSec(session: ActiveFocusSession): number {
  if (session.pausedAt !== null) {
    return Math.min(session.accumulatedSec, MAX_SESSION_SEC);
  }
  const rawDelta = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
  const cappedDelta = Math.min(Math.max(0, rawDelta), MAX_SEGMENT_SEC);
  return Math.min(session.accumulatedSec + cappedDelta, MAX_SESSION_SEC);
}
