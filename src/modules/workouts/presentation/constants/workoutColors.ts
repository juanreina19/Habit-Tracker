import type { WorkoutType } from "../../domain/entities/Workout";
import type { ExerciseType } from "../../domain/entities/WorkoutExercise";

export const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  strength: "var(--info)",
  cardio: "var(--warning)",
  mixed: "var(--purple)",
};

export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
  strength: "var(--info)",
  cardio: "var(--warning)",
};
