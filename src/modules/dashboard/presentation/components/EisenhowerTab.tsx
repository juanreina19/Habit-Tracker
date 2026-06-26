"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { TaskCardDashboard } from "./TaskCardDashboard";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";

interface Props {
  tasks: TaskWithStatus[];
  onToggleTask: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
}

interface Quadrant {
  key: string;
  i18nKey: string;
  color: string;
  borderColor: string;
  tasks: TaskWithStatus[];
}

export function EisenhowerTab({ tasks, onToggleTask, onEditTask, onDeleteTask }: Props) {
  const t = useTranslations("dashboard");

  const quadrants = useMemo<Quadrant[]>(() => {
    const pending = tasks.filter((t) => !isTaskDone(t));

    const isUrgent = (task: TaskWithStatus) =>
      task.priority === "urgent" || task.priority === "high";

    return [
      {
        key: "do",
        i18nKey: "eisenhower_do",
        color: "var(--danger)",
        borderColor: "rgba(239,68,68,0.5)",
        tasks: pending.filter((t) => isUrgent(t) && t.isImportant),
      },
      {
        key: "schedule",
        i18nKey: "eisenhower_schedule",
        color: "var(--info)",
        borderColor: "rgba(59,130,246,0.5)",
        tasks: pending.filter((t) => !isUrgent(t) && t.isImportant),
      },
      {
        key: "delegate",
        i18nKey: "eisenhower_delegate",
        color: "#f59e0b",
        borderColor: "rgba(245,158,11,0.5)",
        tasks: pending.filter((t) => isUrgent(t) && !t.isImportant),
      },
      {
        key: "eliminate",
        i18nKey: "eisenhower_eliminate",
        color: "#888888",
        borderColor: "rgba(136,136,136,0.4)",
        tasks: pending.filter((t) => !isUrgent(t) && !t.isImportant),
      },
    ];
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {quadrants.map((q, i) => (
        <motion.div
          key={q.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className="rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: q.color }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t(q.i18nKey as Parameters<typeof t>[0])}
                </span>
              </span>
            </div>

            <div
              className="flex flex-col gap-1.5 overflow-y-auto pr-0.5"
              style={{ maxHeight: "min(280px, 35vh)" }}
            >
              {q.tasks.length === 0 ? (
                <p
                  className="text-xs text-center py-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  —
                </p>
              ) : (
                q.tasks.map((task) => (
                  <TaskCardDashboard
                    key={task.id}
                    task={task}
                    onToggle={() => onToggleTask(task)}
                    onEdit={() => onEditTask(task)}
                    onDelete={() => onDeleteTask(task)}
                  />
                ))
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
