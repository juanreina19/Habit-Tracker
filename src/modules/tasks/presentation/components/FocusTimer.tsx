"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ActiveFocusSession } from "../lib/focusSessionStorage";
import { getElapsedSec } from "../lib/focusSessionStorage";

const NOTIFIED_KEY = "focus_last_notified_session";

interface Props {
  session: ActiveFocusSession;
  taskTitle: string;
  onPause: () => void;
  onResume: () => void;
  onContinueWorking: () => void;
  onFinish: () => Promise<void> | void;
  onRestart: () => Promise<void> | void;
  isFinishing: boolean;
}

function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer({
  session,
  taskTitle,
  onPause,
  onResume,
  onContinueWorking,
  onFinish,
  onRestart,
  isFinishing,
}: Props) {
  const t = useTranslations("focus");
  const [, forceTick] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = getElapsedSec(session);
  const goalSec = session.durationMin * 60;
  const reachedGoal = elapsedSec >= goalSec;
  const isPaused = session.pausedAt !== null;

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (reachedGoal) {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        const alreadyNotified = localStorage.getItem(NOTIFIED_KEY) === session.clientSessionId;
        if (!alreadyNotified && typeof window !== "undefined" && Notification.permission === "granted") {
          localStorage.setItem(NOTIFIED_KEY, session.clientSessionId);
          new Notification(t("session_completed_title"), {
            body: taskTitle,
            icon: "/api/pwa/icon-192",
          });
        }
      }
    } else {
      notifiedRef.current = false;
    }
  }, [reachedGoal, taskTitle, session.clientSessionId, t]);

  const handleFinish = async () => {
    setActionError(null);
    try {
      await onFinish();
    } catch {
      setActionError(t("finish_error"));
    }
  };

  const handleRestart = async () => {
    setActionError(null);
    try {
      await onRestart();
    } catch {
      setActionError(t("finish_error"));
    }
  };

  // ── Fase: Sesión completada (prompt) ──
  if (reachedGoal && !session.continuedPastGoal) {
    return (
      <div className="rounded-[20px] p-8 text-center flex flex-col gap-4" style={{ background: "var(--surface)" }}>
        <p className="text-2xl">{t("session_completed_title")}</p>
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {taskTitle}
        </p>
        {actionError && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {actionError}
          </p>
        )}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={handleFinish}
            disabled={isFinishing}
            className="py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            {t("register_session")}
          </button>
          <button
            onClick={onContinueWorking}
            disabled={isFinishing}
            className="py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50"
            style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
          >
            {t("continue_working")}
          </button>
        </div>
      </div>
    );
  }

  // ── Fase: Tiempo extra ──
  if (reachedGoal && session.continuedPastGoal) {
    const overtimeSec = elapsedSec - goalSec;
    return (
      <div className="rounded-[20px] p-8 text-center flex flex-col gap-4" style={{ background: "var(--surface)" }}>
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {taskTitle}
        </p>
        <p className="text-4xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
          +{formatClock(overtimeSec)}
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {isPaused ? t("status_paused") : t("status_running")}
        </p>
        {actionError && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {actionError}
          </p>
        )}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex gap-3">
            <button
              onClick={isPaused ? onResume : onPause}
              className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
              style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
            >
              {isPaused ? t("resume") : t("pause")}
            </button>
            <button
              onClick={handleFinish}
              disabled={isFinishing}
              className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              {t("finish")}
            </button>
          </div>
          <button
            onClick={handleRestart}
            disabled={isFinishing}
            className="py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50"
            style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
          >
            {t("register_and_restart")}
          </button>
        </div>
      </div>
    );
  }

  // ── Fase: Corriendo / Pausado ──
  const remainingSec = goalSec - elapsedSec;
  return (
    <div className="rounded-[20px] p-8 text-center flex flex-col gap-4" style={{ background: "var(--surface)" }}>
      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
        {taskTitle}
      </p>
      <p className="text-5xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {formatClock(remainingSec)}
      </p>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {isPaused ? t("status_paused") : t("status_running")}
      </p>
      {actionError && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {actionError}
        </p>
      )}
      <div className="flex gap-3 mt-2">
        <button
          onClick={isPaused ? onResume : onPause}
          className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
          style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
        >
          {isPaused ? t("resume") : t("pause")}
        </button>
        <button
          onClick={handleFinish}
          disabled={isFinishing}
          className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
          style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
        >
          {t("finish")}
        </button>
      </div>
    </div>
  );
}
