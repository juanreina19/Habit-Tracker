"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { formatTaskTime } from "../../domain/entities/Task";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskPriority } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  medium: "#eab308",
  low:    "#6b7280",
};

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultConfirmDelete?: boolean;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onUpdate: (id: UUID, input: UpdateTaskInput) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
}

export function TaskFormDialog({
  open, onClose, task, defaultConfirmDelete = false,
  onCreate, onUpdate, onDelete,
}: Props) {
  const t = useTranslations("tasks");
  const tDays = useTranslations("dayLabels");
  const isEdit = !!task;

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState<TaskPriority>("medium");
  const [dueDate, setDueDate]         = useState("");

  // Recurrencia
  const [isRecurring, setIsRecurring]         = useState(false);
  const [recurrenceDays, setRecurrenceDays]   = useState<number[]>([1,2,3,4,5,6,7]);
  const [daysError, setDaysError]             = useState("");

  // Horario
  const [hasSchedule, setHasSchedule] = useState(false);
  const [startTime, setStartTime]     = useState("");
  const [endTime, setEndTime]         = useState("");
  const [timeError, setTimeError]     = useState("");

  const [titleError, setTitleError]   = useState("");
  const [isSaving, setIsSaving]       = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "medium");
      setDueDate(task?.dueDate ?? "");

      const hasRec = Array.isArray(task?.recurrenceDays) && (task?.recurrenceDays?.length ?? 0) > 0;
      setIsRecurring(hasRec);
      setRecurrenceDays(task?.recurrenceDays?.length ? task.recurrenceDays : [1,2,3,4,5,6,7]);

      const hasSched = !!task?.startTime;
      setHasSchedule(hasSched);
      setStartTime(task?.startTime ? formatTaskTime(task.startTime) : "");
      setEndTime(task?.endTime ? formatTaskTime(task.endTime) : "");

      setTitleError("");
      setDaysError("");
      setTimeError("");
      setIsSaving(false);
      setIsDeleting(false);
      setConfirmDelete(defaultConfirmDelete);
    }
  }, [open, task, defaultConfirmDelete]);

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
    setDaysError("");
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) { setTitleError(t("title_error")); return; }
    if (isRecurring && recurrenceDays.length === 0) { setDaysError(t("recurrence_days_error")); return; }
    if (hasSchedule && endTime && startTime && endTime <= startTime) {
      setTimeError(t("time_end_error")); return;
    }

    setIsSaving(true);
    try {
      const input = {
        title:           trimmed,
        description:     description.trim() || null,
        priority,
        dueDate:         isRecurring ? null : (dueDate || null),
        recurrenceDays:  isRecurring ? recurrenceDays : null,
        startTime:       hasSchedule && startTime ? startTime : null,
        endTime:         hasSchedule && startTime && endTime ? endTime : null,
      } as const;

      if (isEdit && task) {
        await onUpdate(task.id, input);
      } else {
        await onCreate({
          title:           input.title,
          description:     input.description ?? undefined,
          priority,
          dueDate:         input.dueDate ?? undefined,
          recurrenceDays:  input.recurrenceDays ?? undefined,
          startTime:       input.startTime ?? undefined,
          endTime:         input.endTime ?? undefined,
        });
      }
      onClose();
    } catch {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
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
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[24px] outline-none overflow-hidden"
          style={{ background: "var(--surface)", maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto p-6" style={{ maxHeight: "90dvh" }}>
            <Dialog.Title className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              {isEdit ? t("edit_title") : t("new_title")}
            </Dialog.Title>

            <AnimatePresence mode="wait">
              {confirmDelete ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-4"
                >
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {t("delete_confirm")}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                    >
                      {t("delete_cancel")}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
                      style={{ background: "#ef4444", color: "#ffffff" }}
                    >
                      {isDeleting ? "…" : t("delete_confirm_btn")}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-5"
                >
                  {/* Title */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                      {t("title_label")}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                      placeholder={t("title_placeholder")}
                      autoFocus
                      className="w-full rounded-[12px] px-3 py-3 text-sm outline-none"
                      style={{
                        background: "var(--surface-elevated)",
                        color: "var(--text-primary)",
                        border: `1.5px solid ${titleError ? "#ef4444" : "transparent"}`,
                      }}
                    />
                    {titleError && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{titleError}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                      {t("description_label")}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("description_placeholder")}
                      rows={2}
                      className="w-full rounded-[12px] px-3 py-3 text-sm outline-none resize-none"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                      {t("priority_label")}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className="py-2.5 rounded-[12px] text-xs font-semibold transition-all"
                          style={{
                            background: priority === p ? PRIORITY_COLORS[p] + "1A" : "var(--surface-elevated)",
                            color:      priority === p ? PRIORITY_COLORS[p] : "var(--text-secondary)",
                            border:     `1.5px solid ${priority === p ? PRIORITY_COLORS[p] : "transparent"}`,
                          }}
                        >
                          {t(`priority_${p}` as `priority_${TaskPriority}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recurrencia */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                      {t("recurrence_label")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsRecurring(false)}
                        className="py-2.5 rounded-[12px] text-sm font-medium transition-all"
                        style={{
                          background: !isRecurring ? "var(--btn-primary-bg)" : "var(--surface-elevated)",
                          color:      !isRecurring ? "var(--btn-primary-text)" : "var(--text-secondary)",
                        }}
                      >
                        {t("recurrence_once")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRecurring(true)}
                        className="py-2.5 rounded-[12px] text-sm font-medium transition-all"
                        style={{
                          background: isRecurring ? "var(--btn-primary-bg)" : "var(--surface-elevated)",
                          color:      isRecurring ? "var(--btn-primary-text)" : "var(--text-secondary)",
                        }}
                      >
                        {t("recurrence_repeat")}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isRecurring && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 mt-3">
                            {ALL_DAYS.map((day) => {
                              const on = recurrenceDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleDay(day)}
                                  className="flex-1 py-2.5 rounded-[10px] text-xs font-semibold transition-all active:scale-95"
                                  style={{
                                    background: on ? "var(--btn-primary-bg)" : "var(--surface-elevated)",
                                    color:      on ? "var(--btn-primary-text)" : "var(--text-secondary)",
                                  }}
                                >
                                  {tDays(`d${day}` as Parameters<typeof tDays>[0])}
                                </button>
                              );
                            })}
                          </div>
                          {daysError && <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>{daysError}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Due date — solo para tareas únicas */}
                  <AnimatePresence>
                    {!isRecurring && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                          {t("due_date_label")}
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full rounded-[12px] px-3 py-3 text-sm outline-none"
                          style={{
                            background: "var(--surface-elevated)",
                            color: dueDate ? "var(--text-primary)" : "var(--text-muted)",
                            border: "1.5px solid transparent",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Horario */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                        {t("schedule_label")}
                      </label>
                      <button
                        type="button"
                        onClick={() => { setHasSchedule(p => !p); setTimeError(""); }}
                        className="text-xs font-medium px-3 py-1 rounded-full transition-all"
                        style={{
                          background: hasSchedule ? "var(--btn-primary-bg)" : "var(--surface-elevated)",
                          color:      hasSchedule ? "var(--btn-primary-text)" : "var(--text-secondary)",
                        }}
                      >
                        {t("schedule_toggle")}
                      </button>
                    </div>

                    <AnimatePresence>
                      {hasSchedule && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-3">
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                                {t("start_time_label")}
                              </label>
                              <input
                                type="time"
                                value={startTime}
                                onChange={(e) => { setStartTime(e.target.value); setTimeError(""); }}
                                className="w-full rounded-[12px] px-3 py-3 text-sm outline-none"
                                style={{
                                  background: "var(--surface-elevated)",
                                  color: "var(--text-primary)",
                                  border: `1.5px solid ${timeError ? "#ef4444" : "transparent"}`,
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                                {t("end_time_label")}
                              </label>
                              <input
                                type="time"
                                value={endTime}
                                onChange={(e) => { setEndTime(e.target.value); setTimeError(""); }}
                                className="w-full rounded-[12px] px-3 py-3 text-sm outline-none"
                                style={{
                                  background: "var(--surface-elevated)",
                                  color: "var(--text-primary)",
                                  border: `1.5px solid ${timeError ? "#ef4444" : "transparent"}`,
                                }}
                              />
                            </div>
                          </div>
                          {timeError && <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>{timeError}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
                      style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                    >
                      {isSaving ? t("saving") : t("save")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
