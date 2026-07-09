"use client";

import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "@/modules/tasks/presentation/components/TaskCheckbox";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import type { WorkoutWithStatus } from "../../domain/entities/Workout";

interface Props {
  workout: WorkoutWithStatus;
  /** Fila compacta (lista de templates) en vez de la card "hero" del día. */
  compact?: boolean;
  selected?: boolean;
  onToggleComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

/**
 * Una sola card reutilizada tanto para el workout "hero" del día
 * seleccionado como para cada fila de la lista de templates — deliberado,
 * para no repetir la duplicación ya confirmada entre TaskCard/TaskCardDashboard.
 * También es exactamente lo que un futuro "Today's Workout" en el Dashboard
 * necesitaría (compact + onToggleComplete), sin componentes nuevos.
 */
export function WorkoutCard({ workout, compact = false, selected = false, onToggleComplete, onEdit, onDelete, onClick }: Props) {
  const t = useTranslations("workouts");
  const exerciseCount = workout.exercises.length;

  const dayLabel = workout.dayOfWeek ? DAY_LETTERS[workout.dayOfWeek - 1] : t("any_day");
  const timeLabel = workout.startTime ? formatTaskTime(workout.startTime) : null;

  const subtitle = compact
    ? [dayLabel, timeLabel, `${exerciseCount} ${t("exercises_label").toLowerCase()}`].filter(Boolean).join(" · ")
    : timeLabel;

  return (
    <div
      onClick={onClick}
      className={`group rounded-lg flex items-center gap-2.5 card-border-hover transition-colors ${compact ? "p-2" : "p-3"} ${onClick ? "cursor-pointer" : ""}`}
      style={{
        background: selected ? "var(--surface-hover)" : "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      {onToggleComplete && (
        <TaskCheckbox
          done={workout.isCompletedToday}
          size={compact ? TASK_CHECKBOX_SIZE.week : TASK_CHECKBOX_SIZE.card}
          animated
          onToggle={onToggleComplete}
          ariaLabel={t("mark_complete")}
        />
      )}

      <div className="flex-1 min-w-0">
        <p
          className={`truncate ${compact ? "text-sm" : "text-base"}`}
          style={{ color: "var(--text-primary)", textDecoration: workout.isCompletedToday ? "line-through" : "none" }}
        >
          {workout.name}
        </p>
        {subtitle && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onEdit && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--text-secondary)" }} aria-label={t("edit_workout")}>
              <Pencil size={13} strokeWidth={2} />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--danger)" }} aria-label={t("delete")}>
              <Trash2 size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
