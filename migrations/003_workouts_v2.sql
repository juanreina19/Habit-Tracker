-- Migration: Workouts v2 — optional day, drop workout-level type, add reps
-- Safe to run multiple times (IF NOT EXISTS / idempotent ALTERs)

-- ═══════════════════════════════════════════════════════════════════
-- 1. day_of_week pasa a opcional ("cualquier día" por defecto).
--    El CHECK (day_of_week BETWEEN 1 AND 7) ya existente no necesita
--    tocarse: en SQL estándar, CHECK sobre NULL evalúa a UNKNOWN, no a
--    FALSE, así que ya permite NULL sin cambios.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE workouts ALTER COLUMN day_of_week DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Se elimina el tipo a nivel de workout — vive solo por ejercicio
--    (workout_exercises.type), donde ya se usa para el widget %Fuerza/Cardio.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE workouts DROP COLUMN IF EXISTS type;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Reps por ejercicio, junto a sets — sigue sin ser tracking de
--    rendimiento: es el objetivo del plan (estilo "3x10"), nunca un
--    registro de lo realmente hecho.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS reps INT CHECK (reps > 0);
