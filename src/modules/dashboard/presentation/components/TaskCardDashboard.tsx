"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Star } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale } from "@/shared/i18n/useLocale";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { SubtaskList } from "@/modules/tasks/presentation/components/SubtaskList";
import { today as getToday, isTimePast } from "@/shared/lib/utils/dates";
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
  typeLabel?: string;
  userId?: UUID;
}

export function TaskCardDashboard({ task, onToggle, onEdit, overdue, showDescription, showDueDate, typeLabel, userId }: Props) {
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [liveCompleted, setLiveCompleted] = useState<number | null>(null);
  const t = useTranslations("tasks");
  const { locale } = useLocale();
  const done = isTaskDone(task);
  const timeRef = task.endTime;
  const agendaOverdue = !done && !overdue && !!timeRef &&
    (task.dueDate === null || task.dueDate === getToday()) &&
    isTimePast(timeRef);

  const hasSubtasks = (task.subtaskTotal ?? 0) > 0;
  const displayCompleted = liveCompleted !== null ? liveCompleted : (task.subtaskCompleted ?? 0);

  // Reset live count when the card represents a different task
  useEffect(() => { setLiveCompleted(null); }, [task.id]);

  return (
    <div
      className="group relative rounded-md p-2.5 card-border-hover glass-panel"
      style={done ? { border: "1px solid transparent" } : undefined}
    >
      {/* Priority dot — top right with neon pulse; swaps with pencil on hover */}
      {!done && (
        <span
          className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full transition-opacity group-hover:opacity-0"
          style={{
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45) 0%, transparent 65%), ${PRIORITY_COLORS[task.priority]}`,
            ["--dot-glow-soft" as string]: `${PRIORITY_COLORS[task.priority]}40`,
            ["--dot-glow" as string]: `${PRIORITY_COLORS[task.priority]}60`,
            ["--dot-glow-outer" as string]: `${PRIORITY_COLORS[task.priority]}20`,
            ["--dot-glow-far" as string]: `${PRIORITY_COLORS[task.priority]}10`,
            animation: "neon-pulse 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Main row */}
      <div className="flex items-center gap-2 pr-7">
        <TaskCheckbox
          done={done}
          size={TASK_CHECKBOX_SIZE.card}
          animated
          onToggle={onToggle}
          ariaLabel={task.title}
          overdue={overdue}
          variant={overdue ? "focus" : "default"}
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

          {!done && typeLabel && (
            <span className="text-[10px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
              {typeLabel}
            </span>
          )}

          {/* Description — only when not done */}
          {showDescription && task.description && !done && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
              {task.description}
            </p>
          )}

        </div>

        {/* Importance star */}
        {task.isImportant && !done && (
          <Star size={12} fill="var(--text-secondary)" stroke="var(--text-secondary)" className="flex-shrink-0" />
        )}

        {/* Agenda overdue badge — same day, startTime passed */}
        {agendaOverdue && (
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}
          >
            {t("overdue")}
          </span>
        )}

        {/* Subtask count inline — clickeable cuando hay userId */}
        {hasSubtasks && !done && (
          userId ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSubtasksOpen(v => !v); }}
              className="text-[10px] tabular-nums font-medium flex-shrink-0 transition-opacity active:opacity-70"
              style={{ color: subtasksOpen ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {displayCompleted}/{task.subtaskTotal}
            </button>
          ) : (
            <span className="text-[10px] tabular-nums font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              {displayCompleted}/{task.subtaskTotal}
            </span>
          )
        )}

        {/* Edit action — absolute right, swaps with priority dot on hover */}
        <button
          type="button"
          onClick={onEdit}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity active:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* SubtaskList always mounted — bar and counter are live, list animates in/out */}
      {hasSubtasks && !done && userId && (
        <SubtaskList userId={userId} taskId={task.id as UUID} isOpen={subtasksOpen} onCountChange={setLiveCompleted} />
      )}

      {/* Due date — below subtask bar, after everything */}
      {showDueDate && task.dueDate && (
        <p className="text-[10px] mt-1.5 pl-7" style={{ color: "var(--danger)" }}>
          {format(new Date(task.dueDate + "T12:00:00"), "d MMM", { locale: locale === "en" ? enUS : es })}
        </p>
      )}
    </div>
  );
}
