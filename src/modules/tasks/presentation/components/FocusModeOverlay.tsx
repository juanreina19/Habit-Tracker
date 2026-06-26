"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Play, Pause, Settings, SkipForward, RotateCcw, Clock, Flame, Coffee, Moon, Flag, Maximize2, Minimize2, type LucideIcon } from "lucide-react";
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
  onEndSession: () => void;
  onUpdateConfig: (patch: FocusModeSettingsInput) => void;
  onReset: () => void;
}

const PHASE_LABEL_KEY: Record<FocusPhase, "phase_focus" | "phase_short_break" | "phase_long_break"> = {
  focus: "phase_focus", short_break: "phase_short_break", long_break: "phase_long_break",
};
const PHASE_NOTIFY_KEY: Record<FocusPhase, "notify_phase_focus" | "notify_phase_short_break" | "notify_phase_long_break"> = {
  focus: "notify_phase_focus", short_break: "notify_phase_short_break", long_break: "notify_phase_long_break",
};
const PHASE_COLOR: Record<FocusPhase, string> = { focus: "#4CAF82", short_break: "#4A9EFF", long_break: "#B26BFF" };
const PHASE_ICON: Record<FocusPhase, LucideIcon> = { focus: Flame, short_break: Coffee, long_break: Moon };

function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function FocusRing({ percentage, color, children }: { percentage: number; color?: string; children: React.ReactNode }) {
  const size = 260;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  return (
    <div className="relative mx-auto w-full max-w-[260px] lg:max-w-[380px]" style={{ aspectRatio: "1 / 1" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color ?? "var(--text-primary)"} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">{children}</div>
    </div>
  );
}

function IconButton({ icon: Icon, onClick, label, primary, disabled, size = 56 }: {
  icon: LucideIcon; onClick: () => void; label: string; primary?: boolean; disabled?: boolean; size?: number;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="rounded-full flex items-center justify-center transition-opacity active:opacity-70 disabled:opacity-50"
      style={{ width: size, height: size, background: primary ? "var(--btn-primary-bg)" : "var(--surface-elevated)", color: primary ? "var(--btn-primary-text)" : "var(--text-secondary)" }}>
      <Icon size={Math.round(size * 0.42)} strokeWidth={1.5} />
    </button>
  );
}

export function FocusModeOverlay({ session, tasks, toggleTask, onPause, onResume, onSkip, onClose, onEndSession, onUpdateConfig, onReset }: Props) {
  const t = useTranslations("focus");
  const [, forceTick] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { const id = setInterval(() => forceTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);

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
  const pendingCount = tasks.filter((tk) => !isTaskDone(tk)).length;

  const handleSkip = async () => {
    setSkipError(false); setIsSkipping(true);
    try { await onSkip(); } catch { setSkipError(true); } finally { setIsSkipping(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-col min-h-full px-5 py-6 lg:py-8 lg:px-12">
        {/* Top bar — X + Config left, Expand right */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1">
            <button type="button" onClick={onClose} aria-label={t("close_session")}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--text-secondary)" }}>
              <X size={20} strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label={t("settings_label")}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--text-secondary)" }}>
              <Settings size={18} strokeWidth={1.5} />
            </button>
          </div>
          {/* Expand/collapse — desktop only, same height as X */}
          <button type="button" onClick={() => setExpanded(p => !p)}
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-full transition-opacity active:opacity-70"
            style={{ color: "var(--text-muted)" }}>
            {expanded ? <Minimize2 size={16} strokeWidth={1.5} /> : <Maximize2 size={16} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col lg:flex-row lg:gap-0 lg:items-center lg:justify-center">
          {/* Timer column — centered, takes more space */}
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`flex flex-col items-center justify-center gap-6 w-full ${expanded ? "lg:flex-[1]" : "lg:flex-[3]"}`}
          >
            <span className="flex items-center gap-1.5 text-xs font-normal uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ color: phaseColor, background: `${phaseColor}15` }}>
              <PhaseIcon size={13} strokeWidth={1.5} />
              {t(PHASE_LABEL_KEY[session.phase])}
            </span>

            <FocusRing percentage={percentage} color={timerColor}>
              <span className="text-6xl lg:text-8xl font-normal tabular-nums" style={{ color: timerColor }}>
                {formatClock(remainingSec)}
              </span>
              <span className="text-xs lg:text-sm" style={{ color: "var(--text-secondary)" }}>
                {notStarted ? t("status_ready") : isPaused ? t("status_paused") : t("status_running")}
              </span>
            </FocusRing>

            {skipError && <p className="text-xs" style={{ color: "var(--danger)" }}>{t("skip_error")}</p>}

            <div className="flex items-center gap-4">
              <IconButton icon={RotateCcw} onClick={onReset} label={t("reset_session")} size={56} />
              <IconButton icon={isPaused ? Play : Pause}
                onClick={isPaused ? onResume : onPause}
                label={notStarted ? t("start_session") : isPaused ? t("resume") : t("pause")}
                primary size={72} />
              <IconButton icon={SkipForward} onClick={handleSkip} label={t("skip_phase")} disabled={isSkipping} size={56} />
            </div>

            {/* End flow when expanded — desktop */}
            <AnimatePresence>
              {expanded && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  type="button" onClick={onEndSession}
                  className="hidden lg:flex items-center justify-center gap-2 py-3 px-8 rounded-md text-sm font-normal transition-opacity active:opacity-70"
                  style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                  <Flag size={14} strokeWidth={1.5} />
                  {t("end_flow")}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Divider — desktop, hidden when expanded */}
          <AnimatePresence>
            {!expanded && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="hidden lg:block w-px self-stretch mx-8" style={{ background: "var(--border)" }}
              />
            )}
          </AnimatePresence>

          {/* Tasks column */}
          <AnimatePresence>
            {!expanded && tasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col w-full lg:flex-[2] lg:max-w-[360px] mt-8 lg:mt-0 lg:self-stretch"
              >
                <h3 className="text-sm font-normal mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {t("todays_tasks")}
                </h3>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  {t("tasks_pending_count", { count: pendingCount })}
                </p>
                <div className="flex flex-col gap-2 flex-1">
                  {tasks.map((task) => {
                    const done = isTaskDone(task);
                    return (
                      <div key={task.id} className="flex items-center gap-3 rounded-md p-3" style={{ background: "var(--surface)" }}>
                        <TaskCheckbox done={done} size={TASK_CHECKBOX_SIZE.card} animated variant="focus"
                          onToggle={() => toggleTask(task)} ariaLabel={task.title} />
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
                        {task.icon && <span className="flex-shrink-0" style={{ color: "var(--text-secondary)" }}><HabitIcon icon={task.icon} size={16} /></span>}
                        <span className="flex-1 min-w-0 text-sm font-normal truncate"
                          style={{ color: done ? "var(--text-secondary)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>
                          {task.title}
                        </span>
                        {task.startTime && (
                          <span className="flex items-center gap-1 flex-shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <Clock size={12} strokeWidth={1.5} />{formatTaskTime(task.startTime)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={onEndSession}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-md text-sm font-normal mt-4 transition-opacity active:opacity-70"
                  style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                  <Flag size={14} strokeWidth={1.5} />
                  {t("end_flow")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* End flow for mobile when expanded */}
        {expanded && (
          <div className="lg:hidden mt-6">
            <button type="button" onClick={onEndSession}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-md text-sm font-normal transition-opacity active:opacity-70"
              style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <Flag size={14} strokeWidth={1.5} />
              {t("end_flow")}
            </button>
          </div>
        )}
      </div>

      {settingsOpen && (
        <FocusModeSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} session={session} onSave={onUpdateConfig} />
      )}
    </motion.div>
  );
}
