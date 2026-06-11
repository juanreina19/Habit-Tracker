"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Play, Pause, Check, CheckCircle2, type LucideIcon } from "lucide-react";
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

function FocusRing({
  percentage,
  full,
  accent,
  children,
}: {
  percentage: number;
  full?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const size = 260;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const offset = full ? 0 : circumference - (clamped / 100) * circumference;

  return (
    <div className="relative mx-auto" style={{ width: "min(100%, 280px)", aspectRatio: "1 / 1" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent ? "var(--accent)" : "var(--text-primary)"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
        {children}
      </div>
    </div>
  );
}

function IconButton({
  icon: Icon,
  onClick,
  label,
  primary,
  disabled,
  size = 56,
}: {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-full flex items-center justify-center transition-opacity active:opacity-70 disabled:opacity-50"
      style={{
        width: size,
        height: size,
        background: primary ? "var(--btn-primary-bg)" : "var(--surface-elevated)",
        color: primary ? "var(--btn-primary-text)" : "var(--text-secondary)",
      }}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={2} />
    </button>
  );
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
      <div
        className="rounded-[20px] p-6 lg:p-10 flex flex-col items-center gap-5 text-center"
        style={{ background: "var(--surface)" }}
      >
        <FocusRing percentage={100} full accent>
          <CheckCircle2 size={56} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold mt-1">{t("session_completed_title")}</span>
        </FocusRing>
        <p className="text-sm font-medium truncate max-w-full" style={{ color: "var(--text-primary)" }}>
          {taskTitle}
        </p>
        {actionError && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {actionError}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
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
      <div
        className="rounded-[20px] p-6 lg:p-10 flex flex-col items-center gap-5 text-center"
        style={{ background: "var(--surface)" }}
      >
        <p className="text-sm font-medium truncate max-w-full" style={{ color: "var(--text-primary)" }}>
          {taskTitle}
        </p>
        <FocusRing percentage={100} full accent>
          <span className="text-6xl lg:text-7xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
            +{formatClock(overtimeSec)}
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {isPaused ? t("status_paused") : t("status_running")}
          </span>
        </FocusRing>
        {actionError && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {actionError}
          </p>
        )}
        <div className="flex items-center gap-4 mt-1">
          <IconButton
            icon={isPaused ? Play : Pause}
            onClick={isPaused ? onResume : onPause}
            label={isPaused ? t("resume") : t("pause")}
            primary
            size={72}
          />
          <IconButton icon={Check} onClick={handleFinish} label={t("finish")} disabled={isFinishing} size={56} />
        </div>
        <button
          onClick={handleRestart}
          disabled={isFinishing}
          className="py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50 w-full max-w-xs"
          style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
        >
          {t("register_and_restart")}
        </button>
      </div>
    );
  }

  // ── Fase: Corriendo / Pausado / No iniciado ──
  const remainingSec = goalSec - elapsedSec;
  const percentage = (elapsedSec / goalSec) * 100;
  const notStarted = isPaused && Math.floor(elapsedSec) === 0;

  return (
    <div
      className="rounded-[20px] p-6 lg:p-10 flex flex-col items-center gap-5"
      style={{ background: "var(--surface)" }}
    >
      <p className="text-sm font-medium truncate max-w-full" style={{ color: "var(--text-primary)" }}>
        {taskTitle}
      </p>
      <FocusRing percentage={percentage}>
        <span className="text-6xl lg:text-7xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
          {formatClock(remainingSec)}
        </span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {notStarted ? t("status_ready") : isPaused ? t("status_paused") : t("status_running")}
        </span>
      </FocusRing>
      {actionError && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {actionError}
        </p>
      )}
      <div className="flex items-center gap-4 mt-1">
        <IconButton
          icon={isPaused ? Play : Pause}
          onClick={isPaused ? onResume : onPause}
          label={notStarted ? t("start_session") : isPaused ? t("resume") : t("pause")}
          primary
          size={72}
        />
        <IconButton icon={Check} onClick={handleFinish} label={t("finish")} disabled={isFinishing} size={56} />
      </div>
    </div>
  );
}
