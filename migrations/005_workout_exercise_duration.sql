-- Migration: Workout exercises — alternativa por tiempo (minutos) a las
-- repeticiones, ej. "calentamiento en bicicleta, 5 minutos". El modo se
-- infiere en la app de cuál de los dos (reps vs duration_min) está
-- poblado — no hay una columna de "modo" separada.

ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS duration_min INT CHECK (duration_min > 0);
