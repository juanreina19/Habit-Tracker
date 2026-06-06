"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useTasks } from "../hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { TaskEmptyState } from "./TaskEmptyState";
import { TaskFormDialog } from "./TaskFormDialog";
import { isTaskDone } from "../../domain/entities/Task";
import type { Task, TaskPriority, CreateTaskInput, UpdateTaskInput } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function getGroup(task: Task, todayStr: string): number {
  if (!task.dueDate) return 3;
  if (task.dueDate < todayStr) return 0;
  if (task.dueDate === todayStr) return 1;
  return 2;
}

function sortPending(tasks: Task[]): Task[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  return [...tasks].sort((a, b) => {
    const ga = getGroup(a, todayStr);
    const gb = getGroup(b, todayStr);
    if (ga !== gb) return ga - gb;
    return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
  });
}

interface Props {
  userId: UUID;
}

export default function TasksView({ userId }: Props) {
  const t = useTranslations("tasks");
  const { tasks, isLoading, createTask, updateTask, toggleTask, deleteTask } = useTasks(userId);

  const [dialogOpen, setDialogOpen]               = useState(false);
  const [selectedTask, setSelectedTask]           = useState<Task | null>(null);
  const [dialogStartAtDelete, setDialogStartAtDelete] = useState(false);
  const [showDone, setShowDone]                   = useState(true);

  const pending = sortPending(tasks.filter((t) => !isTaskDone(t)));
  const done    = tasks.filter((t) => isTaskDone(t));

  const openCreate = () => {
    setSelectedTask(null);
    setDialogStartAtDelete(false);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setSelectedTask(task);
    setDialogStartAtDelete(false);
    setDialogOpen(true);
  };

  const openDelete = (task: Task) => {
    setSelectedTask(task);
    setDialogStartAtDelete(true);
    setDialogOpen(true);
  };

  if (isLoading) return <TasksSkeleton />;

  return (
    <>
      <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {t("title")}
            </h1>
          </div>
          <button
            onClick={openCreate}
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            aria-label={t("new_task")}
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
          <button
            onClick={openCreate}
            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full transition-opacity active:opacity-70"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span className="text-sm font-semibold">{t("new_task")}</span>
          </button>
        </div>

        {/* Pending section */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              {t("pending")} ({pending.length})
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
          </div>

          {pending.length === 0 ? (
            <TaskEmptyState />
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {pending.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task)}
                    onEdit={() => openEdit(task)}
                    onDelete={() => openDelete(task)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Completed section — collapsible */}
        {done.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowDone((p) => !p)}
              className="flex items-center gap-2 mb-3 w-full text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                {t("completed")} ({done.length})
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
              {showDone
                ? <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />
                : <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />}
            </button>

            <AnimatePresence>
              {showDone && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 pb-1">
                    {done.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => toggleTask(task)}
                        onEdit={() => openEdit(task)}
                        onDelete={() => openDelete(task)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setDialogStartAtDelete(false); }}
        task={selectedTask}
        defaultConfirmDelete={dialogStartAtDelete}
        onCreate={async (input: CreateTaskInput) => { await createTask(input); }}
        onUpdate={async (id, input: UpdateTaskInput) => { await updateTask(id, input); }}
        onDelete={async (id) => { await deleteTask(id); }}
      />
    </>
  );
}

function TasksSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      <div className="h-7 w-24 rounded-lg mb-8 animate-pulse" style={{ background: "var(--surface)" }} />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-[16px] animate-pulse" style={{ background: "var(--surface)" }} />
        ))}
      </div>
    </div>
  );
}
