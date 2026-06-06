"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskPriority } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

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
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onUpdate: (id: UUID, input: UpdateTaskInput) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
}

export function TaskFormDialog({ open, onClose, task, onCreate, onUpdate, onDelete }: Props) {
  const t = useTranslations("tasks");
  const isEdit = !!task;

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]     = useState<TaskPriority>("medium");
  const [dueDate, setDueDate]       = useState("");
  const [titleError, setTitleError] = useState("");
  const [isSaving, setIsSaving]     = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "medium");
      setDueDate(task?.dueDate ?? "");
      setTitleError("");
      setIsSaving(false);
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }, [open, task]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) { setTitleError(t("title_error")); return; }
    setIsSaving(true);
    try {
      if (isEdit && task) {
        await onUpdate(task.id, {
          title: trimmed,
          description: description.trim() || null,
          priority,
          dueDate: dueDate || null,
        });
      } else {
        await onCreate({
          title: trimmed,
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
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
          style={{ background: "rgba(0,0,0,0.45)" }}
        />
        <Dialog.Content
          className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full rounded-t-[24px] sm:rounded-[20px] px-5 pt-5 pb-8 shadow-2xl"
          style={{ background: "var(--bg)" }}
        >
          <Dialog.Title className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
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
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    {t("delete_cancel")}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#ef4444", opacity: isDeleting ? 0.6 : 1 }}
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
                className="flex flex-col gap-4"
              >
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}>
                    {t("title_label")}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                    placeholder={t("title_placeholder")}
                    autoFocus
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border"
                    style={{
                      background: "var(--surface)",
                      color: "var(--text-primary)",
                      borderColor: titleError ? "#ef4444" : "var(--border)",
                    }}
                  />
                  {titleError && (
                    <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{titleError}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}>
                    {t("description_label")}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("description_placeholder")}
                    rows={2}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border resize-none"
                    style={{
                      background: "var(--surface)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border)",
                    }}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}>
                    {t("priority_label")}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className="py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: priority === p ? PRIORITY_COLORS[p] + "22" : "var(--surface)",
                          color: priority === p ? PRIORITY_COLORS[p] : "var(--text-secondary)",
                          border: `1.5px solid ${priority === p ? PRIORITY_COLORS[p] : "var(--border)"}`,
                        }}
                      >
                        {t(`priority_${p}` as `priority_${TaskPriority}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due date */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}>
                    {t("due_date_label")}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border"
                    style={{
                      background: "var(--surface)",
                      color: dueDate ? "var(--text-primary)" : "var(--text-secondary)",
                      borderColor: "var(--border)",
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                    style={{ background: "var(--btn-primary-bg)", opacity: isSaving ? 0.6 : 1 }}
                  >
                    {isSaving ? t("saving") : t("save")}
                  </button>
                </div>

                {/* Delete (edit mode only) */}
                {isEdit && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium mt-1"
                    style={{ color: "#ef4444" }}
                  >
                    {t("delete")}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
