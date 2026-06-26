"use client";

import { useTranslations } from "next-intl";
import { Pencil, Star } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale } from "@/shared/i18n/useLocale";
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
  showDescription?: boolean;
  showDueDate?: boolean;
}

export function TaskCardDashboard({ task, onToggle, onEdit, overdue, showDescription, showDueDate }: Props) {
  const t = useTranslations("tasks");
  const { locale } = useLocale();
  const done = isTaskDone(task);

  const hasSubtasks = (task.subtaskTotal ?? 0) > 0;
  const subtaskPct = hasSubtasks ? ((task.subtaskCompleted ?? 0) / task.subtaskTotal!) * 100 : 0;

  return (
    <div
      className="group relative rounded-md p-2.5"
      style={{
        background: "var(--bg)",
        border: done ? "1px solid transparent" : "1px solid var(--border)",
      }}
    >
      {/* Priority dot — top right with neon glow */}
      {!done && (
        <span
          className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full"
          style={{
            background: PRIORITY_COLORS[task.priority],
            boxShadow: `0 0 6px 1px ${PRIORITY_COLORS[task.priority]}80`,
          }}
        />
      )}

      {/* Main row */}
      <div className="flex items-center gap-2 pr-5">
        <TaskCheckbox
          done={done}
          size={TASK_CHECKBOX_SIZE.card}
          animated
          onToggle={onToggle}
          ariaLabel={task.title}
          overdue={overdue}
        />
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-normal truncate block"
            style={{
              color: done ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {task.title}
          </span>

          {/* Description — only when not done */}
          {showDescription && task.description && !done && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
              {task.description}
            </p>
          )}

          {/* Due date — for overdue cards */}
          {showDueDate && task.dueDate && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--danger)" }}>
              {format(new Date(task.dueDate + "T12:00:00"), "d MMM", { locale: locale === "en" ? enUS : es })}
            </p>
          )}
        </div>

        {/* Importance star */}
        {task.isImportant && !done && (
          <Star size={12} fill="var(--text-secondary)" stroke="var(--text-secondary)" className="flex-shrink-0" />
        )}

        {/* Subtask count inline */}
        {hasSubtasks && !done && (
          <span className="text-[10px] tabular-nums font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {task.subtaskCompleted}/{task.subtaskTotal}
          </span>
        )}

        {/* Edit action — visible on hover */}
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
      {hasSubtasks && !done && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${subtaskPct}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
