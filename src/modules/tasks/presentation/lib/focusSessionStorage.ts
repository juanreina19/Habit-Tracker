import type { ISOTimestamp } from "@/shared/types/database.types";

const STORAGE_KEY = "focus_active_session";

/** Tope por segmento "corriendo": evita que un salto de reloj hacia adelante
 *  (cambio de zona horaria, reloj manual) inyecte horas de golpe. */
export const MAX_SEGMENT_SEC = 8 * 60 * 60; // 8h

/** Tope total de una sesión: cubre "cerró la laptop y volvió días después". */
export const MAX_SESSION_SEC = 24 * 60 * 60; // 24h

/** Una sesión pausada hace más de esto se considera abandonada al releer el blob. */
const STALE_PAUSED_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface ActiveFocusSession {
  userId: string;              // dueño de la sesión — permite descartar blobs de otra cuenta
  clientSessionId: string;     // uuid generado por start(); dedup de notificaciones entre pestañas
  taskId: string;
  taskTitle: string;           // snapshot — por si la tarea se borra/renombra
  durationMin: number;         // snapshot de task.focusDurationMin AL INICIAR la sesión
  startedAt: ISOTimestamp;      // inicio del segmento "corriendo" actual
  pausedAt: ISOTimestamp | null; // ISOTimestamp si está pausado, null si corre
  accumulatedSec: number;       // segundos acumulados ANTES del segmento actual
  continuedPastGoal: boolean;   // true = el usuario ya eligió "Continuar trabajando"
}

/** Lee la sesión activa del localStorage. Devuelve null si no hay, o si el blob está corrupto. */
export function readActiveSession(): ActiveFocusSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveFocusSession;
  } catch {
    clearActiveSession();
    return null;
  }
}

export function writeActiveSession(session: ActiveFocusSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
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

/**
 * Inicio del día actual en hora local, como ISOTimestamp (UTC).
 * DST-safe: usa el constructor local de Date, no aritmética de milisegundos.
 * Reutilizable para futuras metas diarias / estadísticas.
 */
export function getStartOfLocalDay(): ISOTimestamp {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}
