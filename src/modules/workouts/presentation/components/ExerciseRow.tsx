"use client";

import { useTranslations } from "next-intl";
import { EXERCISE_TYPE_COLORS } from "../constants/workoutColors";
import type { WorkoutExercise } from "../../domain/entities/WorkoutExercise";

interface Props {
  exercise: Pick<WorkoutExercise, "id" | "name" | "type" | "sets">;
}

/** Fila de solo lectura — reutilizada por TemplatesExercisesPanel (detalle)
 *  y por la card "hero" del día seleccionado en WorkoutsView. */
export function ExerciseRow({ exercise }: Props) {
  const t = useTranslations("workouts");
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: EXERCISE_TYPE_COLORS[exercise.type] }} />
      <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{exercise.name}</span>
      {exercise.sets && (
        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {exercise.sets} {t("sets_label").toLowerCase()}
        </span>
      )}
    </div>
  );
}
