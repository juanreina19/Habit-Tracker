"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { X, Zap, Clock } from "lucide-react";
import { useTodayTasks } from "../hooks/useTodayTasks";
import { useTimeFormat } from "@/shared/components/TimeFormatProvider";
import { isTaskDone, formatTaskTime } from "../../domain/entities/Task";
import { PRIORITY_COLORS } from "../constants/taskColors";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "./TaskCheckbox";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: UUID;
  onStart: (taskIds: UUID[], durationMin: number) => void;
}

export function FocusModeTaskPickerDialog({ open, onClose, userId, onStart }: Props) {
  const t = useTranslations("focus");
  const { format } = useTimeFormat();
  const { tasks } = useTodayTasks(userId);
  const [selected, setSelected] = useState<Set<UUID>>(new Set());
  const [duration, setDuration] = useState(25);

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const pending = tasks.filter((tk) => !isTaskDone(tk));

  const toggle = (id: UUID) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    onStart(Array.from(selected), duration);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden [animation:dialog-in_0.22s_cubic-bezier(0.16,1,0.3,1)] glass-panel-elevated"
          style={{ maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto p-6 flex flex-col gap-4" style={{ maxHeight: "90dvh" }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Dialog.Title className="text-lg font-normal" style={{ color: "var(--text-primary)" }}>
                  {t("picker_heading")}
                </Dialog.Title>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("picker_subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
                style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {pending.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {t("picker_empty_today")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {pending.map((task) => {
                  const checked = selected.has(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggle(task.id)}
                      className="flex items-center gap-3 rounded-lg p-4 text-left transition-opacity active:opacity-70 glass-panel"
                      style={checked ? { border: "1.5px solid var(--accent)" } : undefined}
                    >
                      <TaskCheckbox done={checked} size={TASK_CHECKBOX_SIZE.card} variant="focus" />
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_COLORS[task.priority] }}
                      />
                      {task.icon && (
                        <span className="flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                          <HabitIcon icon={task.icon} size={18} />
                        </span>
                      )}
                      <span className="flex-1 min-w-0 text-sm font-normal truncate" style={{ color: "var(--text-primary)" }}>
                        {task.title}
                      </span>
                      {task.startTime && (
                        <span className="flex items-center gap-1 flex-shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <Clock size={13} />
                          {formatTaskTime(task.startTime, format)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              {[5, 15, 25, 45].map(min => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDuration(min)}
                  className={`flex-1 py-2 rounded-md text-xs font-normal transition-colors ${duration === min ? "" : "glass-panel"}`}
                  style={{
                    background: duration === min ? "var(--text-primary)" : undefined,
                    color: duration === min ? "var(--bg)" : "var(--text-muted)",
                  }}
                >
                  {min} min
                </button>
              ))}
            </div>

            <button
              onClick={handleStart}
              disabled={selected.size === 0}
              className="w-full py-3 rounded-lg text-sm font-normal transition-opacity active:opacity-70 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              <Zap size={16} />
              {t("start_flow", { count: selected.size })}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
