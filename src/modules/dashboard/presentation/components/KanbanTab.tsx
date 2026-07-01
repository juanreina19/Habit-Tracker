"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { TaskCardDashboard } from "./TaskCardDashboard";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import type { TaskWithStatus, TaskStatus } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  tasks: TaskWithStatus[];
  onToggleTask: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
  onUpdateStatus: (taskId: UUID, status: TaskStatus) => void;
}

interface KanbanColumn {
  key: TaskStatus;
  i18nKey: string;
  color: string;
  tasks: TaskWithStatus[];
}

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

function nextStatus(current: TaskStatus): TaskStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

export function KanbanTab({ userId, tasks, onToggleTask, onEditTask, onDeleteTask, onUpdateStatus }: Props) {
  const t = useTranslations("dashboard");

  const columns = useMemo<KanbanColumn[]>(() => {
    return [
      {
        key: "todo" as TaskStatus,
        i18nKey: "kanban_todo",
        color: "var(--text-secondary)",
        tasks: tasks.filter((tk) => !isTaskDone(tk) && (tk.status === "todo" || !tk.status)),
      },
      {
        key: "in_progress" as TaskStatus,
        i18nKey: "kanban_in_progress",
        color: "var(--info)",
        tasks: tasks.filter((tk) => !isTaskDone(tk) && tk.status === "in_progress"),
      },
      {
        key: "done" as TaskStatus,
        i18nKey: "kanban_done",
        color: "var(--accent)",
        tasks: tasks.filter((tk) => isTaskDone(tk) || tk.status === "done"),
      },
    ];
  }, [tasks]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
      {columns.map((col, i) => (
        <motion.div
          key={col.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className="min-w-[260px] lg:min-w-0 flex-shrink-0 lg:flex-shrink flex flex-col rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t(col.i18nKey as Parameters<typeof t>[0])}
                </span>
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {col.tasks.length}
              </span>
            </div>

            <div
              className="flex flex-col gap-1.5 overflow-y-auto pr-0.5"
              style={{ maxHeight: "min(400px, 50vh)" }}
            >
              {col.tasks.length === 0 ? (
                <p
                  className="text-xs text-center py-6"
                  style={{ color: "var(--text-muted)" }}
                >
                  —
                </p>
              ) : (
                col.tasks.map((task) => {
                  const next = nextStatus(task.status ?? "todo");
                  return (
                    <div key={task.id} className="group/kanban relative">
                      <TaskCardDashboard
                        task={task}
                        userId={userId}
                        onToggle={() => onToggleTask(task)}
                        onEdit={() => onEditTask(task)}
                        onDelete={() => onDeleteTask(task)}
                      />
                      {next && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(task.id, next)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/kanban:opacity-100 transition-opacity p-1 rounded-sm"
                          style={{ background: "var(--surface)", color: "var(--text-muted)" }}
                          title={t(
                            `kanban_${next}` as Parameters<typeof t>[0]
                          )}
                        >
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
