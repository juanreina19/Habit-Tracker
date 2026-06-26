"use client";

import { useTranslations } from "next-intl";
import { Pencil, Star } from "lucide-react";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import { PRIORITY_COLORS } from "@/modules/tasks/presentation/constants/taskColors";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "@/modules/tasks/presentation/components/TaskCheckbox";

interface Props {
  task: TaskWithStatus;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  overdue?: boolean;
}

export function TaskCardDashboard({ task, onToggle, onEdit, overdue }: Props) {
  const done = isTaskDone(task);

  const hasSubtasks = (task.subtaskTotal ?? 0) > 0;
  const subtaskPct = hasSubtasks ? ((task.subtaskCompleted ?? 0) / task.subtaskTotal!) * 100 : 0;

  return (
    <div
      className="group relative rounded-md p-2.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Priority dot — top right with neon glow */}
      <span
        className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
        style={{
          background: PRIORITY_COLORS[task.priority],
          boxShadow: `0 0 6px 1px ${PRIORITY_COLORS[task.priority]}80`,
        }}
      />

      {/* Single compact row */}
      <div className="flex items-center gap-2 pr-5">
        <TaskCheckbox
          done={done}
          size={TASK_CHECKBOX_SIZE.card}
          animated
          onToggle={onToggle}
          ariaLabel={task.title}
          overdue={overdue}
        />
        <span
          className="flex-1 min-w-0 text-sm font-normal truncate"
          style={{
            color: done ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {task.title}
        </span>

        {/* Importance star */}
        {task.isImportant && (
          <Star size={12} fill="var(--text-secondary)" stroke="var(--text-secondary)" className="flex-shrink-0" />
        )}

        {/* Subtask count inline */}
        {hasSubtasks && (
          <span className="text-[10px] tabular-nums font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {task.subtaskCompleted}/{task.subtaskTotal}
          </span>
        )}

        {/* Edit action — visible on hover, z-10 over priority dot */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 relative z-10">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded-sm transition-opacity active:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>

      {/* Subtask progress bar */}
      {hasSubtasks && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${subtaskPct}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
