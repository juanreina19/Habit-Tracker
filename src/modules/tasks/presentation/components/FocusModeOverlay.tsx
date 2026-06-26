"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Play, Pause, Settings, SkipForward, RotateCcw, Clock, Flame, Coffee, Moon, type LucideIcon } from "lucide-react";
import type { FocusModeSession, FocusPhase } from "../../domain/entities/FocusModeSession";
import { getElapsedSec } from "../../domain/entities/FocusModeSession";
import type { TaskWithStatus } from "../../domain/entities/Task";
import { isTaskDone, formatTaskTime } from "../../domain/entities/Task";
import { PRIORITY_COLORS } from "../constants/taskColors";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "./TaskCheckbox";
import { FocusModeSettingsDialog } from "./FocusModeSettingsDialog";
import type { FocusModeSettingsInput } from "../hooks/useFocusMode";

interface Props {
  session: FocusModeSession;
  tasks: TaskWithStatus[];
  toggleTask: (task: TaskWithStatus) => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => Promise<void> | void;
  onClose: () => void;
  onUpdateConfig: (patch: FocusModeSettingsInput) => void;
  onReset: () => void;
}

const PHASE_LABEL_KEY: Record<FocusPhase, "phase_focus" | "phase_short_break" | "phase_long_break"> = {
  focus: "phase_focus",
  short_break: "phase_short_break",
  long_break: "phase_long_break",
};

const PHASE_NOTIFY_KEY: Record<FocusPhase, "notify_phase_focus" | "notify_phase_short_break" | "notify_phase_long_break"> = {
  focus: "notify_phase_focus",
  short_break: "notify_phase_short_break",
  long_break: "notify_phase_long_break",
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

function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function FocusRing({
  percentage,
  color,
  children,
}: {
  percentage: number;
  color?: string;
  children: React.ReactNode;
}) {
  const size = 260;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative mx-auto w-full max-w-[280px] lg:max-w-[420px]" style={{ aspectRatio: "1 / 1" }}>
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

export function FocusModeOverlay({ session, tasks, toggleTask, onPause, onResume, onSkip, onClose, onUpdateConfig, onReset }: Props) {
  const t = useTranslations("focus");
  const [, forceTick] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState(false);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Notifica al usuario cada vez que cambia la fase (foco↔descanso), si hay permiso concedido.
  const prevPhaseRef = useRef(session.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== session.phase) {
      prevPhaseRef.current = session.phase;
      if (typeof window !== "undefined" && Notification.permission === "granted") {
        new Notification(t(PHASE_NOTIFY_KEY[session.phase]), { icon: "/api/pwa/icon-192" });
      }
    }
  }, [session.phase, t]);

  const elapsedSec = getElapsedSec(session);
  const goalSec = session.durationMin * 60;
  const remainingSec = Math.max(0, goalSec - elapsedSec);
  const percentage = (remainingSec / goalSec) * 100;
  const isPaused = session.pausedAt !== null;
  const notStarted = isPaused && Math.floor(elapsedSec) === 0;
  const timerColor = session.phase === "focus" ? "var(--text-primary)" : PHASE_COLOR[session.phase];
  const phaseColor = PHASE_COLOR[session.phase];
  const PhaseIcon = PHASE_ICON[session.phase];

  const handleSkip = async () => {
    setSkipError(false);
    setIsSkipping(true);
    try {
      await onSkip();
    } catch {
      setSkipError(true);
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-col px-5 py-8 lg:py-10 lg:px-12 xl:px-24 gap-6 lg:gap-10 max-w-lg lg:max-w-7xl w-full mx-auto min-h-full lg:justify-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <span
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ color: phaseColor, background: `${phaseColor}15` }}
          >
            <PhaseIcon size={13} strokeWidth={2.5} />
            {t(PHASE_LABEL_KEY[session.phase])}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("settings_label")}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              <Settings size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close_session")}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Cuerpo: timer + tareas (lado a lado en escritorio) */}
        <div className="flex flex-col items-center gap-6 w-full lg:flex-row lg:items-start lg:justify-center lg:gap-20">
          {/* Timer */}
          <div className="flex flex-col items-center gap-6 w-full lg:w-auto lg:flex-shrink-0">
            <FocusRing percentage={percentage} color={timerColor}>
              <span className="text-6xl lg:text-8xl font-medium tabular-nums" style={{ color: timerColor }}>
                {formatClock(remainingSec)}
              </span>
              <span className="text-xs lg:text-sm" style={{ color: "var(--text-secondary)" }}>
                {notStarted ? t("status_ready") : isPaused ? t("status_paused") : t("status_running")}
              </span>
            </FocusRing>

            {skipError && (
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                {t("skip_error")}
              </p>
            )}

            {/* Controles */}
            <div className="flex items-center gap-4">
              <IconButton icon={RotateCcw} onClick={onReset} label={t("reset_session")} size={56} />
              <IconButton
                icon={isPaused ? Play : Pause}
                onClick={isPaused ? onResume : onPause}
                label={notStarted ? t("start_session") : isPaused ? t("resume") : t("pause")}
                primary
                size={72}
              />
              <IconButton icon={SkipForward} onClick={handleSkip} label={t("skip_phase")} disabled={isSkipping} size={56} />
            </div>
          </div>

          {/* Tareas seleccionadas */}
          {tasks.length > 0 && (() => {
            const pendingCount = tasks.filter((tk) => !isTaskDone(tk)).length;
            return (
              <div className="flex flex-col gap-2 w-full lg:w-[380px] lg:flex-shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                  {t("tasks_pending_count", { count: pendingCount })}
                </h3>
                {tasks.map((task) => {
                  const done = isTaskDone(task);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg p-4"
                      style={{ background: "var(--surface-elevated)" }}
                    >
                      <TaskCheckbox
                        done={done}
                        size={TASK_CHECKBOX_SIZE.card}
                        animated
                        variant="focus"
                        onToggle={() => toggleTask(task)}
                        ariaLabel={task.title}
                      />
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_COLORS[task.priority] }}
                      />
                      {task.icon && (
                        <span className="flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                          <HabitIcon icon={task.icon} size={18} />
                        </span>
                      )}
                      <span
                        className="flex-1 min-w-0 text-sm font-medium truncate"
                        style={{
                          color: done ? "var(--text-secondary)" : "var(--text-primary)",
                          textDecoration: done ? "line-through" : "none",
                        }}
                      >
                        {task.title}
                      </span>
                      {task.startTime && (
                        <span className="flex items-center gap-1 flex-shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <Clock size={13} />
                          {formatTaskTime(task.startTime)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {settingsOpen && (
        <FocusModeSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          session={session}
          onSave={onUpdateConfig}
        />
      )}
    </motion.div>
  );
}
