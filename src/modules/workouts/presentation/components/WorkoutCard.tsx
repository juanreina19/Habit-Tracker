"use client";

import { useTranslations } from "next-intl";
import { Clock, Hourglass, Pencil, Trash2 } from "lucide-react";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "@/modules/tasks/presentation/components/TaskCheckbox";
import { MetadataPill } from "@/shared/components/ui/MetadataPill";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { WORKOUT_TYPE_COLORS } from "../constants/workoutColors";
import type { WorkoutWithStatus } from "../../domain/entities/Workout";
import type { Category } from "@/modules/categories/domain/entities/Category";

interface Props {
  workout: WorkoutWithStatus;
  category?: Category | null;
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
export function WorkoutCard({ workout, category, compact = false, selected = false, onToggleComplete, onEdit, onDelete, onClick }: Props) {
  const t = useTranslations("workouts");
  const typeColor = WORKOUT_TYPE_COLORS[workout.type];
  const exerciseCount = workout.exercises.length;

  return (
    <div
      onClick={onClick}
      className={`group rounded-lg flex items-center gap-3 card-border-hover transition-colors ${compact ? "p-3" : "p-4"} ${onClick ? "cursor-pointer" : ""}`}
      style={{
        background: selected ? "var(--surface-hover)" : "var(--surface)",
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

      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: typeColor }} />

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${compact ? "text-sm" : "text-base"}`}
          style={{ color: "var(--text-primary)", textDecoration: workout.isCompletedToday ? "line-through" : "none" }}
        >
          {workout.name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <MetadataPill value={t(`type_${workout.type}`)} dotColor={typeColor} />
          {category && <MetadataPill value={category.name} dotColor={category.color ?? undefined} />}
          {workout.startTime && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <Clock size={11} strokeWidth={1.5} />
              {formatTaskTime(workout.startTime)}
            </span>
          )}
          {workout.estimatedDurationMin && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <Hourglass size={11} strokeWidth={1.5} />
              {workout.estimatedDurationMin} {t("duration_unit")}
            </span>
          )}
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {exerciseCount} {t("exercises_label").toLowerCase()}
          </span>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onEdit && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--text-secondary)" }} aria-label={t("edit_workout")}>
              <Pencil size={13} strokeWidth={1.5} />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
              style={{ color: "var(--danger)" }} aria-label={t("delete")}>
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
