"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Plus, X, Trash2, ChevronRight, Star } from "lucide-react";
import { formatTaskTime } from "../../domain/entities/Task";
import { today } from "@/shared/lib/utils/dates";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskPriority } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { PRIORITY_COLORS } from "../constants/taskColors";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { IconPickerDialog } from "@/shared/components/ui/IconPickerDialog";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "./TaskCheckbox";
import { useSubtasks } from "../hooks/useSubtasks";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  userId: UUID;
  defaultConfirmDelete?: boolean;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onUpdate: (task: Task, input: UpdateTaskInput) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
}

export function TaskFormDialog({
  open, onClose, task, userId, defaultConfirmDelete = false,
  onCreate, onUpdate, onDelete,
}: Props) {
  const t = useTranslations("tasks");
  const tDays = useTranslations("dayLabels");
  const tCat = useTranslations("iconCategories");
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

  const [isImportant, setIsImportant]  = useState(false);
  const [categoryId, setCategoryId]   = useState<string | null>(null);
  const [icon, setIcon]               = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const { categories } = useCategories(userId);

  const [titleError, setTitleError]   = useState("");
  const [isSaving, setIsSaving]       = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState<string[]>([]);
  const { subtasks, createSubtask, toggleSubtask, deleteSubtask } = useSubtasks(userId, task?.id ?? null);

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

      setIsImportant(task?.isImportant ?? false);
      setCategoryId(task?.categoryId ?? null);
      setIcon(task?.icon ?? null);

      setTitleError("");
      setDaysError("");
      setTimeError("");
      setIsSaving(false);
      setIsDeleting(false);
      setConfirmDelete(defaultConfirmDelete);
      setNewSubtaskTitle("");
      setLocalSubtasks([]);
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
        categoryId:      categoryId ?? null,
        dueDate:         isRecurring ? null : (dueDate || null),
        recurrenceDays:  isRecurring ? recurrenceDays : null,
        startTime:       hasSchedule && startTime ? startTime : null,
        endTime:         hasSchedule && startTime && endTime ? endTime : null,
        icon:            icon ?? null,
        isImportant,
      } as const;

      if (isEdit && task) {
        await onUpdate(task, input);
      } else {
        await onCreate({
          title:           input.title,
          description:     input.description ?? undefined,
          priority,
          categoryId:      input.categoryId ?? undefined,
          dueDate:         input.dueDate ?? undefined,
          recurrenceDays:  input.recurrenceDays ?? undefined,
          startTime:       input.startTime ?? undefined,
          endTime:         input.endTime ?? undefined,
          icon:            input.icon ?? undefined,
          isImportant:     input.isImportant,
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
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden"
          style={{ background: "var(--surface)", maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto p-6" style={{ maxHeight: "90dvh" }}>
            {/* Close button — top right */}
            <div className="flex items-center justify-end mb-2">
              <Dialog.Title className="sr-only">
                {isEdit ? t("edit_title") : t("new_title")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1 rounded-md transition-opacity active:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={t("close")}
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

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
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 rounded-md text-sm font-medium transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                    >
                      {t("delete_cancel")}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 py-3 rounded-md text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50"
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
                  {/* Title — large, inline-editable feel */}
                  <div>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !isEdit && title.trim()) { e.preventDefault(); handleSave(); } }}
                      placeholder={t("title_placeholder")}
                      autoFocus
                      className="w-full text-2xl font-normal outline-none bg-transparent"
                      style={{
                        color: "var(--text-primary)",
                        borderBottom: titleError ? "2px solid #ef4444" : "none",
                      }}
                    />
                    {titleError && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{titleError}</p>}
                  </div>

                  {/* Description — open notes area */}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("description_placeholder")}
                    rows={2}
                    className="w-full text-sm outline-none resize-none bg-transparent"
                    style={{ color: "var(--text-secondary)" }}
                  />

                  {/* Subtasks — right after description */}
                  <div>
                    {isEdit && subtasks.length > 0 && (
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: "var(--text-secondary)" }}>
                          {t("subtasks_label")}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {subtasks.filter(s => s.isCompleted).length}/{subtasks.length}
                        </span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(subtasks.filter(s => s.isCompleted).length / subtasks.length) * 100}%`,
                              background: "var(--accent)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {isEdit && subtasks.length === 0 && (
                      <label className="text-[11px] font-medium uppercase tracking-[0.12em] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                        {t("subtasks_label")}
                      </label>
                    )}
                    {isEdit ? (
                      <div className="flex flex-col gap-1">
                        {subtasks.map((s) => (
                          <div key={s.id} className="group/sub flex items-center gap-2.5 py-0.5">
                            <TaskCheckbox
                              done={s.isCompleted}
                              size={TASK_CHECKBOX_SIZE.week}
                              onToggle={() => toggleSubtask(s)}
                              ariaLabel={s.title}
                            />
                            <span
                              className="flex-1 text-sm"
                              style={{
                                color: s.isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                                textDecoration: s.isCompleted ? "line-through" : "none",
                              }}
                            >
                              {s.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteSubtask(s.id)}
                              aria-label={t("delete_subtask")}
                              className="p-0.5 rounded-sm opacity-0 group-hover/sub:opacity-100 transition-opacity"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2.5 mt-1">
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{ background: "var(--border)", color: "var(--text-muted)" }}
                          >
                            <Plus size={10} strokeWidth={2.5} />
                          </span>
                          <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const value = newSubtaskTitle.trim();
                                if (value) {
                                  createSubtask({ title: value });
                                  setNewSubtaskTitle("");
                                }
                              }
                            }}
                            placeholder={t("add_subtask")}
                            className="flex-1 py-1 text-sm outline-none bg-transparent"
                            style={{ color: "var(--text-muted)" }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {localSubtasks.map((st, idx) => (
                          <div key={idx} className="group/sub flex items-center gap-2.5 py-0.5">
                            <span className="w-4 h-4 rounded-full flex-shrink-0 border" style={{ borderColor: "var(--border)" }} />
                            <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{st}</span>
                            <button
                              type="button"
                              onClick={() => setLocalSubtasks(prev => prev.filter((_, i) => i !== idx))}
                              className="p-0.5 rounded-sm opacity-0 group-hover/sub:opacity-100 transition-opacity"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2.5 py-0.5">
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{ background: "var(--border)", color: "var(--text-muted)" }}
                          >
                            <Plus size={10} strokeWidth={2.5} />
                          </span>
                          <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const value = newSubtaskTitle.trim();
                                if (value) {
                                  setLocalSubtasks(prev => [...prev, value]);
                                  setNewSubtaskTitle("");
                                }
                              }
                            }}
                            placeholder={t("add_subtask")}
                            className="flex-1 py-1 text-sm outline-none bg-transparent"
                            style={{ color: "var(--text-muted)" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata pills row — compact dark capsules */}
                  <div className="flex flex-wrap gap-1.5 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Category pill */}
                    {categories.length > 0 && (
                      <div className="relative group/cat">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                          style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: categories.find(c => c.id === categoryId)?.color ?? "var(--text-muted)" }} />
                          <span style={{ color: "var(--text-muted)" }}>IN</span>
                          {categories.find(c => c.id === categoryId)?.name ?? "—"}
                        </button>
                        <div
                          className="absolute left-0 top-full mt-1 z-10 rounded-lg p-1 min-w-[140px] hidden group-focus-within/cat:block"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                        >
                          <button
                            type="button"
                            onClick={() => setCategoryId(null)}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors"
                            style={{ color: !categoryId ? "var(--text-primary)" : "var(--text-secondary)" }}
                          >
                            —
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCategoryId(cat.id)}
                              className="w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors"
                              style={{ color: categoryId === cat.id ? "var(--text-primary)" : "var(--text-secondary)" }}
                            >
                              {cat.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />}
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Date pill */}
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("task-date-input");
                        if (input) (input as HTMLInputElement).showPicker?.();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dueDate ? "var(--accent)" : "var(--text-muted)" }} />
                      <span style={{ color: "var(--text-muted)" }}>DATE</span>
                      {dueDate || t("form_free")}
                    </button>

                    {/* Repeat pill */}
                    <button
                      type="button"
                      onClick={() => setIsRecurring(prev => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isRecurring ? "#3b82f6" : "var(--text-muted)" }} />
                      <span style={{ color: "var(--text-muted)" }}>REPEAT</span>
                      {isRecurring ? t("recurrence_repeat") : t("recurrence_once")}
                    </button>

                    {/* Time pill */}
                    <button
                      type="button"
                      onClick={() => { setHasSchedule(p => !p); setTimeError(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: hasSchedule && startTime ? "#8b5cf6" : "var(--text-muted)" }} />
                      <span style={{ color: "var(--text-muted)" }}>TIME</span>
                      {hasSchedule && startTime ? startTime : t("form_free")}
                    </button>

                    {/* Priority pill — dropdown selector */}
                    <div className="relative group/pri">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[priority] }} />
                        {t(`priority_${priority}` as `priority_${TaskPriority}`)}
                      </button>
                      <div
                        className="absolute left-0 top-full mt-1 z-10 rounded-lg p-1 min-w-[140px] hidden group-focus-within/pri:block"
                        style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                      >
                        {PRIORITIES.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors"
                            style={{ color: priority === p ? "var(--text-primary)" : "var(--text-secondary)" }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
                            {t(`priority_${p}` as `priority_${TaskPriority}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Importance pill */}
                    {isImportant && (
                      <button
                        type="button"
                        onClick={() => setIsImportant(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                      >
                        <Star size={10} fill="var(--text-primary)" strokeWidth={0} />
                        {t("important")}
                      </button>
                    )}
                  </div>

                  {/* Hidden date input for native picker */}
                  <input
                    id="task-date-input"
                    type="date"
                    value={dueDate}
                    min={today()}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                  />

                  {/* Recurrence days — shown when recurring is active */}
                  <AnimatePresence>
                    {isRecurring && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-2">
                          {ALL_DAYS.map((day) => {
                            const on = recurrenceDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className="flex-1 py-2 rounded-md text-xs font-medium transition-all duration-200 active:scale-95"
                                style={{
                                  background: on ? "var(--text-primary)" : "var(--surface-elevated)",
                                  color:      on ? "var(--bg)" : "var(--text-secondary)",
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

                  {/* Time inputs — shown when schedule is active */}
                  <AnimatePresence>
                    {hasSchedule && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                              {t("start_time_label")}
                            </label>
                            <input
                              type="time"
                              value={startTime}
                              onChange={(e) => { setStartTime(e.target.value); setTimeError(""); }}
                              className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
                              style={{
                                background: "var(--surface-elevated)",
                                color: "var(--text-primary)",
                                border: `1.5px solid ${timeError ? "#ef4444" : "transparent"}`,
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                              {t("end_time_label")}
                            </label>
                            <input
                              type="time"
                              value={endTime}
                              onChange={(e) => { setEndTime(e.target.value); setTimeError(""); }}
                              className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
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

                  {/* Icon — compact row */}
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-opacity active:opacity-70 w-full"
                    style={{ background: "var(--surface-elevated)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--border)" }}
                    >
                      {icon ? (
                        <HabitIcon icon={icon} size={16} color="var(--text-primary)" />
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </div>
                    <span className="text-sm font-medium flex-1 text-left" style={{ color: "var(--text-primary)" }}>
                      {icon ? icon.replace(/^lucide:/, "") : t("no_icon")}
                    </span>
                    <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                  </button>
                  <IconPickerDialog
                    open={iconPickerOpen}
                    onClose={() => setIconPickerOpen(false)}
                    value={icon}
                    onChange={setIcon}
                    allowNone
                    noneLabel={t("icon_none")}
                    title={t("select_icon")}
                    categoryLabel={(key) => tCat(key as Parameters<typeof tCat>[0])}
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-1 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {!isEdit && (
                      <p className="flex-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        Press <strong>Enter</strong> to create
                      </p>
                    )}
                    {isEdit && (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="p-2.5 rounded-md transition-opacity active:opacity-70"
                        style={{ color: "var(--danger)" }}
                        aria-label={t("delete")}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    <div className="ml-auto">
                      <button
                        onClick={handleSave}
                        disabled={isSaving || (!isEdit && !title.trim())}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-30"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      >
                        {isSaving ? t("saving") : isEdit ? t("save") : t("add_task")}
                        {!isEdit && <span>→</span>}
                      </button>
                    </div>
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
