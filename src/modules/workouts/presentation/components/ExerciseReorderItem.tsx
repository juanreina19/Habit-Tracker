"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, ChevronDown, Trash2 } from "lucide-react";
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
  reps: number | null;
  durationMin: number | null;
  notes: string | null;
}

interface Props {
  exercise: ExerciseDraft;
  onChangeType: (type: ExerciseType) => void;
  onChangeSets: (sets: number | null) => void;
  onChangeReps: (reps: number | null) => void;
  onChangeDuration: (durationMin: number | null) => void;
  onDelete: () => void;
}

/**
 * Card colapsable y reordenable de un ejercicio dentro de WorkoutFormDialog
 * — el flujo de creación solo pide el nombre (defaults 3x10 ya aplicados
 * por CreateWorkoutExerciseUseCase); esta card deja editar series/reps/tipo
 * expandiéndola. Reorder vía framer-motion Reorder + dragControls, mismo
 * mecanismo que HabitReorderItem (HabitsView.tsx) y el drag ya corregido de
 * EnfoqueTab — no dnd-kit (evita reintroducir el bug de "hay que sostener"
 * en móvil).
 */
export function ExerciseReorderItem({ exercise, onChangeType, onChangeSets, onChangeReps, onChangeDuration, onDelete }: Props) {
  const t = useTranslations("workouts");
  const dragControls = useDragControls();
  const [expanded, setExpanded] = useState(false);

  // El modo se infiere de cuál campo está poblado, no hay un flag de modo
  // separado que se pueda desincronizar.
  const isTimeMode = exercise.durationMin != null;

  const subtitle = isTimeMode
    ? `${exercise.durationMin} ${t("duration_min_short")}`
    : exercise.sets && exercise.reps
      ? `${exercise.sets} ${t("sets_label").toLowerCase()} x ${exercise.reps} ${t("reps_short")}`
      : null;

  return (
    <Reorder.Item
      as="div"
      value={exercise}
      dragControls={dragControls}
      dragListener={false}
      className="flex items-center gap-2"
    >
      <div className="flex-1 min-w-0 rounded-md" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-2.5 p-2.5">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex-shrink-0 self-start mt-0.5 transition-transform"
            style={{ color: "var(--text-muted)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-label={t("exercise_name_placeholder")}
          >
            <ChevronDown size={14} strokeWidth={2} />
          </button>

          <button type="button" onClick={() => setExpanded((p) => !p)} className="flex-1 min-w-0 text-left">
            <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{exercise.name}</p>
            {subtitle && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
          </button>

          <span className="text-[10px] uppercase tracking-wide flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {exercise.type === "strength" ? t("type_strength") : t("type_cardio")}
          </span>
        </div>

        {expanded && (
          <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
            {/* Modo Reps / Tiempo */}
            <div className="inline-flex self-start rounded-sm overflow-hidden" style={{ border: "1px solid var(--border)", padding: "2px" }}>
              <button
                type="button"
                onClick={() => onChangeDuration(null)}
                className="px-2.5 py-1 rounded-[2px] text-[10px] uppercase tracking-wide transition-colors"
                style={{
                  background: !isTimeMode ? "var(--surface-hover)" : "transparent",
                  color: !isTimeMode ? "var(--text-primary)" : "var(--text-muted-darker)",
                }}
              >
                {t("mode_reps")}
              </button>
              <button
                type="button"
                onClick={() => { onChangeReps(null); onChangeDuration(exercise.durationMin ?? 5); }}
                className="px-2.5 py-1 rounded-[2px] text-[10px] uppercase tracking-wide transition-colors"
                style={{
                  background: isTimeMode ? "var(--surface-hover)" : "transparent",
                  color: isTimeMode ? "var(--text-primary)" : "var(--text-muted-darker)",
                }}
              >
                {t("mode_time")}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[9px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                  {t("sets_label")}
                </label>
                <input
                  type="number"
                  min={1}
                  value={exercise.sets ?? ""}
                  onChange={(e) => onChangeSets(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-md px-2.5 py-1.5 text-sm outline-none"
                  style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid transparent" }}
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                  {isTimeMode ? t("duration_label") : t("reps_label")}
                </label>
                {isTimeMode ? (
                  <input
                    type="number"
                    min={1}
                    value={exercise.durationMin ?? ""}
                    onChange={(e) => onChangeDuration(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-md px-2.5 py-1.5 text-sm outline-none"
                    style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid transparent" }}
                  />
                ) : (
                  <input
                    type="number"
                    min={1}
                    value={exercise.reps ?? ""}
                    onChange={(e) => onChangeReps(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-md px-2.5 py-1.5 text-sm outline-none"
                    style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid transparent" }}
                  />
                )}
              </div>
              <div className="flex gap-1 self-end pb-1.5">
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
              <button
                type="button"
                onClick={onDelete}
                className="flex-shrink-0 self-end pb-2 transition-opacity active:opacity-60"
                style={{ color: "var(--danger)" }}
                aria-label={t("delete")}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: "var(--text-muted)" }}
      >
        <GripVertical size={16} strokeWidth={2} />
      </div>
    </Reorder.Item>
  );
}
