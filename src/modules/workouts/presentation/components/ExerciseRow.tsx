"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import type { WorkoutExercise } from "../../domain/entities/WorkoutExercise";

interface Props {
  exercise: Pick<WorkoutExercise, "id" | "name" | "sets" | "reps" | "durationMin">;
  /** "line" (default): fila plana con separador — usado por el acordeón de
   *  TemplatesExercisesPanel. "card": cada ejercicio en su propia card
   *  bg+borde — usado por la card "hero" del día seleccionado en WorkoutsView. */
  variant?: "line" | "card";
}

/** Fila de solo lectura — reutilizada por TemplatesExercisesPanel (acordeón)
 *  y por la card "hero" del día seleccionado en WorkoutsView. Estilo plano
 *  ("Bench Press … 3x10" o "Bici … 5 min"), sin dot de color. */
export function ExerciseRow({ exercise, variant = "line" }: Props) {
  const t = useTranslations("workouts");
  const setsReps = exercise.durationMin != null
    ? `${exercise.durationMin} ${t("duration_min_short")}`
    : exercise.sets && exercise.reps ? `${exercise.sets}x${exercise.reps}` : null;

  return (
    <div
      className={variant === "card" ? "flex items-center gap-2.5 p-2.5 rounded-lg" : "flex items-center gap-2 py-1"}
      style={variant === "card" ? { background: "var(--bg)", border: "1px solid var(--border)" } : undefined}
    >
      {variant === "line" && (
        <ChevronRight size={12} strokeWidth={2} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      )}
      <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{exercise.name}</span>
      {setsReps && (
        <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
          {setsReps}
        </span>
      )}
    </div>
  );
}
