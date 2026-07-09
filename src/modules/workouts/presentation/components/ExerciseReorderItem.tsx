"use client";

import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { EXERCISE_TYPE_COLORS } from "../constants/workoutColors";
import type { ExerciseType } from "../../domain/entities/WorkoutExercise";

/** Borrador de ejercicio dentro del formulario — id temporal (crypto.randomUUID())
 *  mientras el workout todavía no existe, o el id real una vez persistido. */
export interface ExerciseDraft {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number | null;
  notes: string | null;
}

interface Props {
  exercise: ExerciseDraft;
  onChangeType: (type: ExerciseType) => void;
  onDelete: () => void;
}

/**
 * Fila reordenable de un ejercicio dentro de WorkoutFormDialog — mismo
 * mecanismo framer-motion Reorder + dragControls que HabitReorderItem
 * (HabitsView.tsx) y el recién corregido drag de EnfoqueTab, no dnd-kit
 * (evita reintroducir el bug de "hay que sostener" en móvil).
 */
export function ExerciseReorderItem({ exercise, onChangeType, onDelete }: Props) {
  const t = useTranslations("workouts");
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={exercise}
      dragControls={dragControls}
      dragListener={false}
      className="rounded-md p-3 flex items-center gap-2.5"
      style={{ background: "var(--surface-elevated)" }}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: "var(--text-muted)" }}
      >
        <GripVertical size={16} strokeWidth={1.5} />
      </div>

      <span className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--text-primary)" }}>
        {exercise.name}
      </span>

      {exercise.sets && (
        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {exercise.sets} {t("sets_label").toLowerCase()}
        </span>
      )}

      <div className="flex gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChangeType("strength")}
          className="w-2.5 h-2.5 rounded-full transition-transform"
          style={{
            background: EXERCISE_TYPE_COLORS.strength,
            opacity: exercise.type === "strength" ? 1 : 0.25,
            transform: exercise.type === "strength" ? "scale(1.2)" : "scale(1)",
          }}
          aria-label={t("type_strength")}
        />
        <button
          type="button"
          onClick={() => onChangeType("cardio")}
          className="w-2.5 h-2.5 rounded-full transition-transform"
          style={{
            background: EXERCISE_TYPE_COLORS.cardio,
            opacity: exercise.type === "cardio" ? 1 : 0.25,
            transform: exercise.type === "cardio" ? "scale(1.2)" : "scale(1)",
          }}
          aria-label={t("type_cardio")}
        />
      </div>

      <button type="button" onClick={onDelete} className="flex-shrink-0 transition-opacity active:opacity-60" style={{ color: "var(--text-muted)" }} aria-label={t("delete")}>
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </Reorder.Item>
  );
}
