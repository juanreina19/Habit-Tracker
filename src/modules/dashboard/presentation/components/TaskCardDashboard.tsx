"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Star } from "lucide-react";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import { isTaskDone, formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { PRIORITY_COLORS } from "@/modules/tasks/presentation/constants/taskColors";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "@/modules/tasks/presentation/components/TaskCheckbox";

interface Props {
  task: TaskWithStatus;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  overdue?: boolean;
}

export function TaskCardDashboard({ task, onToggle, onEdit, onDelete, overdue }: Props) {
  const t = useTranslations("tasks");
  const [expanded, setExpanded] = useState(false);
  const done = isTaskDone(task);

  const hasSubtasks = (task.subtaskTotal ?? 0) > 0;
  const subtaskPct = hasSubtasks ? ((task.subtaskCompleted ?? 0) / task.subtaskTotal!) * 100 : 0;

  const formatRelativeDate = (date: string): string => {
    const today = new Date();
    const d = new Date(date + "T12:00:00");
    const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return t("today");
    if (diffDays === -1) return t("yesterday");
    if (diffDays < -1) return t("overdue");
    const day = d.getDate();
    const month = d.toLocaleDateString("default", { month: "short" });
    return `${month} ${day}`;
  };

  return (
    <div
      className="group relative rounded-lg p-2.5 transition-all cursor-pointer"
      style={{
        background: "var(--surface)",
        border: overdue ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--border)",
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        setExpanded(p => !p);
      }}
    >
      {/* Priority dot — top right */}
      <span
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{ background: PRIORITY_COLORS[task.priority] }}
      />

      {/* Compact row */}
      <div className="flex items-center gap-2 pr-4">
        <TaskCheckbox
          done={done}
          size={TASK_CHECKBOX_SIZE.card}
          animated
          onToggle={onToggle}
          ariaLabel={task.title}
        />
        <span
          className="flex-1 min-w-0 text-sm font-medium truncate"
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
        {hasSubtasks && !expanded && (
          <span className="text-[10px] tabular-nums font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {task.subtaskCompleted}/{task.subtaskTotal}
          </span>
        )}

        {/* Date */}
        {task.dueDate && (
          <span
            className="text-[10px] font-medium flex-shrink-0"
            style={{ color: overdue ? "#ef4444" : "var(--text-muted)" }}
          >
            {formatRelativeDate(task.dueDate)}
          </span>
        )}

        {/* Edit action — visible on hover (desktop), z-10 over priority dot */}
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
      {hasSubtasks && !expanded && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${subtaskPct}%`, background: "var(--accent)" }}
            />
          </div>
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            {task.subtaskCompleted}/{task.subtaskTotal}
          </span>
        </div>
      )}

      {/* Time badge */}
      {task.startTime && !expanded && (
        <div className="mt-1.5">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {formatTaskTime(task.startTime)}
            {task.endTime ? ` – ${formatTaskTime(task.endTime)}` : ""}
          </span>
        </div>
      )}

      {/* Expanded view */}
      {expanded && (
        <div className="mt-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Meta line */}
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span className="font-medium uppercase" style={{ color: PRIORITY_COLORS[task.priority] }}>
              {t(`priority_${task.priority}`)}
            </span>
            {task.startTime && (
              <>
                <span>·</span>
                <span>
                  {formatTaskTime(task.startTime)}
                  {task.endTime ? ` – ${formatTaskTime(task.endTime)}` : ""}
                </span>
              </>
            )}
            {task.dueDate && (
              <>
                <span>·</span>
                <span style={{ color: overdue ? "#ef4444" : undefined }}>
                  {formatRelativeDate(task.dueDate)}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {task.description}
            </p>
          )}

          {/* Subtasks */}
          {hasSubtasks && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${subtaskPct}%`, background: "var(--accent)" }}
                  />
                </div>
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                  {task.subtaskCompleted}/{task.subtaskTotal}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
