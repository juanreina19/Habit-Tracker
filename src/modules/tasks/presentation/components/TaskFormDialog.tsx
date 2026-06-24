"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ChevronRight, Star } from "lucide-react";
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
            <Dialog.Title className="sr-only">
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
                      className="flex-1 py-3 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                    >
                      {t("delete_cancel")}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 py-3 rounded-lg text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
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
                      className="w-full text-2xl font-semibold outline-none bg-transparent"
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

                  {/* Metadata pills row */}
                  <div className="flex flex-wrap gap-1.5 py-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Priority pills */}
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                        style={{
                          background: priority === p ? PRIORITY_COLORS[p] + "1A" : "var(--surface-elevated)",
                          color:      priority === p ? PRIORITY_COLORS[p] : "var(--text-secondary)",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
                        {t(`priority_${p}` as `priority_${TaskPriority}`)}
                      </button>
                    ))}

                    {/* Importance pill */}
                    <button
                      type="button"
                      onClick={() => setIsImportant((p) => !p)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                      style={{
                        background: isImportant ? "rgba(245,158,11,0.12)" : "var(--surface-elevated)",
                        color: isImportant ? "#F59E0B" : "var(--text-secondary)",
                      }}
                    >
                      <Star size={11} fill={isImportant ? "#F59E0B" : "none"} strokeWidth={isImportant ? 0 : 1.5} />
                      {isImportant ? t("important") : t("mark_important")}
                    </button>

                    {/* Category pills */}
                    {categories.length > 0 && (
                      <>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                            style={{
                              background: categoryId === cat.id
                                ? (cat.color ? cat.color + "1A" : "var(--btn-primary-bg)")
                                : "var(--surface-elevated)",
                              color: categoryId === cat.id
                                ? (cat.color ?? "var(--btn-primary-text)")
                                : "var(--text-secondary)",
                            }}
                          >
                            {cat.color && (
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            )}
                            {cat.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Recurrencia */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                      {t("recurrence_label")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsRecurring(false)}
                        className="py-2.5 rounded-md text-sm font-medium transition-all"
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
                        className="py-2.5 rounded-md text-sm font-medium transition-all"
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
                                  className="flex-1 py-2.5 rounded-md text-xs font-semibold transition-all duration-200 active:scale-95 hover:brightness-110"
                                  style={{
                                    background: on ? "var(--accent)" : "var(--surface-elevated)",
                                    color:      on ? "#ffffff" : "var(--text-secondary)",
                                    border:     on ? "2px solid #3d9468" : "2px solid transparent",
                                    boxShadow:  on ? "0 2px 10px -3px rgba(76,175,130,0.55)" : "none",
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
                        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                          {t("due_date_label")}
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          min={today()}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full rounded-md px-3 py-3 text-sm outline-none"
                          style={{
                            background: "var(--surface-elevated)",
                            color: dueDate ? "var(--text-primary)" : "var(--text-muted)",
                            border: "1.5px solid transparent",
                            WebkitAppearance: "none",
                            appearance: "none",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Horario */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-secondary)" }}>
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
                                className="w-full rounded-md px-3 py-3 text-sm outline-none"
                                style={{
                                  background: "var(--surface-elevated)",
                                  color: "var(--text-primary)",
                                  border: `1.5px solid ${timeError ? "#ef4444" : "transparent"}`,
                                  WebkitAppearance: "none",
                                  appearance: "none",
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
                                className="w-full rounded-md px-3 py-3 text-sm outline-none"
                                style={{
                                  background: "var(--surface-elevated)",
                                  color: "var(--text-primary)",
                                  border: `1.5px solid ${timeError ? "#ef4444" : "transparent"}`,
                                  WebkitAppearance: "none",
                                  appearance: "none",
                                }}
                              />
                            </div>
                          </div>
                          {timeError && <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>{timeError}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Icono */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                      {t("icon_label")}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(true)}
                      className="w-full flex items-center justify-between px-4 py-4 rounded-lg transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--border)" }}
                        >
                          {icon ? (
                            <HabitIcon icon={icon} size={20} color="var(--text-primary)" />
                          ) : (
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {icon ? icon.replace(/^lucide:/, "") : t("no_icon")}
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
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
                  </div>

                  {/* Subtareas */}
                  <div>
                    {isEdit && subtasks.length > 0 && (
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-secondary)" }}>
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
                      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                        {t("subtasks_label")}
                      </label>
                    )}
                    {!isEdit && (
                      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                        {t("subtasks_label")}
                      </label>
                    )}
                    {isEdit ? (
                      <div className="flex flex-col gap-2">
                        {subtasks.map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
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
                              className="p-1.5 rounded-sm transition-opacity active:opacity-70"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {subtasks.length === 0 && (
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {t("subtasks_empty")}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
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
                            placeholder={t("subtask_placeholder")}
                            className="flex-1 rounded-md px-3 py-2.5 text-sm outline-none"
                            style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const value = newSubtaskTitle.trim();
                              if (value) {
                                createSubtask({ title: value });
                                setNewSubtaskTitle("");
                              }
                            }}
                            aria-label={t("add_subtask")}
                            className="w-9 h-9 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
                            style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {t("subtasks_hint_new_task")}
                      </p>
                    )}
                  </div>

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
                        className="p-2.5 rounded-lg transition-opacity active:opacity-70"
                        style={{ color: "var(--danger)" }}
                        aria-label={t("delete")}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                      >
                        {t("cancel")}
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
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
