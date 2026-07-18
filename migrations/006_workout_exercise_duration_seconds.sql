-- Migration: workout_exercises.duration_min -> duration_sec
-- El campo pasa de minutos a segundos (ejemplos reales: "30 seg", no
-- fracciones de minuto). Requiere que 005_workout_exercise_duration.sql
-- ya haya corrido (esa migración creó la columna original duration_min).

ALTER TABLE workout_exercises RENAME COLUMN duration_min TO duration_sec;
