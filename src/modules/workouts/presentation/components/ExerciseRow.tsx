"use client";

import type { WorkoutExercise } from "../../domain/entities/WorkoutExercise";

interface Props {
  exercise: Pick<WorkoutExercise, "id" | "name" | "sets" | "reps">;
}

/** Fila de solo lectura — reutilizada por TemplatesExercisesPanel (acordeón)
 *  y por la card "hero" del día seleccionado en WorkoutsView. Estilo plano
 *  ("Bench Press … 3x10"), sin dot de color, separador delgado entre filas. */
export function ExerciseRow({ exercise }: Props) {
  const setsReps = exercise.sets && exercise.reps ? `${exercise.sets}x${exercise.reps}` : null;

  return (
    <div className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{exercise.name}</span>
      {setsReps && (
        <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
          {setsReps}
        </span>
      )}
    </div>
  );
}
