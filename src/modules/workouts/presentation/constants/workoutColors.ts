import type { ExerciseType } from "../../domain/entities/WorkoutExercise";

/** Blanco/negro según tema para Fuerza (resalta), gris apagado para Cardio
 *  (contrasta sin ser llamativo) — sin azul/naranja, per feedback de diseño. */
export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
  strength: "var(--text-primary)",
  cardio: "var(--text-muted)",
};
