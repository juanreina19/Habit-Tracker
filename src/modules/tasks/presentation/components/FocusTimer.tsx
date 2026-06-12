"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Play, Pause, Check, CheckCircle2, Settings, Flame, Coffee, Moon, type LucideIcon } from "lucide-react";
import type { ActiveFocusSession, FocusPhase } from "../../domain/entities/ActiveFocusSession";
import { getElapsedSec } from "../../domain/entities/ActiveFocusSession";
import type { Task, UpdateTaskInput } from "../../domain/entities/Task";
import { FocusSessionSettingsDialog } from "./FocusSessionSettingsDialog";

const NOTIFIED_KEY = "focus_last_notified_session";

interface Props {
  session: ActiveFocusSession;
  taskTitle: string;
  task: Task;
  onSaveConfig: (input: UpdateTaskInput) => Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onContinueWorking: () => void;
  onFinish: () => Promise<void> | void;
  onRestart: () => Promise<void> | void;
  isFinishing: boolean;
}

const PHASE_LABEL_KEY: Record<FocusPhase, "phase_focus" | "phase_short_break" | "phase_long_break"> = {
  focus: "phase_focus",
  short_break: "phase_short_break",
  long_break: "phase_long_break",
};

/** Color de acento por fase: foco usa el verde de la app; los descansos tienen su propio color.
 *  Hex literal (no var()) porque se usa también para fondos con alpha (`${color}15`). */
const PHASE_COLOR: Record<FocusPhase, string> = {
  focus: "#4CAF82",
  short_break: "#4A9EFF",
  long_break: "#B26BFF",
};

const PHASE_ICON: Record<FocusPhase, LucideIcon> = {
  focus: Flame,
  short_break: Coffee,
  long_break: Moon,
};

function FocusPhaseHeader({
  session,
  task,
  onSaveConfig,
}: {
  session: ActiveFocusSession;
  task: Task;
  onSaveConfig: (input: UpdateTaskInput) => Promise<void>;
}) {
  const t = useTranslations("focus");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const phaseColor = PHASE_COLOR[session.phase];
  const PhaseIcon = PHASE_ICON[session.phase];

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ color: phaseColor, background: `${phaseColor}15` }}
        >
          <PhaseIcon size={13} strokeWidth={2.5} />
          {t(PHASE_LABEL_KEY[session.phase])}
        </span>
        {session.sessionsGoal > 1 && (
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {t("pomodoro_progress", { current: session.sessionIndex, total: session.sessionsGoal })}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label={t("settings_label")}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        <Settings size={18} strokeWidth={2} />
      </button>

      {settingsOpen && (
        <FocusSessionSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          task={task}
          onSave={onSaveConfig}
        />
      )}
    </div>
  );
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
  color,
  children,
}: {
  percentage: number;
  full?: boolean;
  color?: string;
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
          stroke={color ?? "var(--text-primary)"}
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
  task,
  onSaveConfig,
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
  const isFinalFocusGoal = session.phase === 'focus' && session.sessionIndex >= session.sessionsGoal;

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (reachedGoal && isFinalFocusGoal) {
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
  }, [reachedGoal, isFinalFocusGoal, taskTitle, session.clientSessionId, t]);

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
  if (reachedGoal && !session.continuedPastGoal && isFinalFocusGoal) {
    return (
      <div
        className="rounded-[20px] p-6 lg:p-10 flex flex-col items-center gap-5 text-center"
        style={{ background: "var(--surface)" }}
      >
        <FocusPhaseHeader session={session} task={task} onSaveConfig={onSaveConfig} />
        <FocusRing percentage={100} full color={PHASE_COLOR.focus}>
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
  if (reachedGoal && session.continuedPastGoal && isFinalFocusGoal) {
    const overtimeSec = elapsedSec - goalSec;
    return (
      <div
        className="rounded-[20px] p-6 lg:p-10 flex flex-col items-center gap-5 text-center"
        style={{ background: "var(--surface)" }}
      >
        <FocusPhaseHeader session={session} task={task} onSaveConfig={onSaveConfig} />
        <p className="text-sm font-medium truncate max-w-full" style={{ color: "var(--text-primary)" }}>
          {taskTitle}
        </p>
        <FocusRing percentage={100} full color={PHASE_COLOR.focus}>
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
  // El anillo arranca completo (blanco) y se va vaciando en sentido antihorario
  // a medida que transcurre el tiempo, reflejando el tiempo RESTANTE.
  const percentage = (remainingSec / goalSec) * 100;
  const notStarted = isPaused && Math.floor(elapsedSec) === 0;
  // En descansos, el anillo y el reloj usan el color de la fase para distinguir
  // descanso corto de descanso largo a simple vista.
  const timerColor = session.phase === "focus" ? "var(--text-primary)" : PHASE_COLOR[session.phase];

  return (
    <div
      className="rounded-[20px] p-6 lg:p-10 flex flex-col items-center gap-5"
      style={{ background: "var(--surface)" }}
    >
      <FocusPhaseHeader session={session} task={task} onSaveConfig={onSaveConfig} />
      <p className="text-sm font-medium truncate max-w-full" style={{ color: "var(--text-primary)" }}>
        {taskTitle}
      </p>
      <FocusRing percentage={percentage} color={timerColor}>
        <span className="text-6xl lg:text-7xl font-bold tabular-nums" style={{ color: timerColor }}>
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
