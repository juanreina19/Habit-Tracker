-- Migration: Workouts module
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS patterns)

-- ═══════════════════════════════════════════════════════════════════
-- 1. Workouts: exercise_catalog (autocomplete only, no enforced FK from
--    workout_exercises — renaming/deleting an entry here never breaks
--    an existing workout's denormalized name/type)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exercise_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  default_type  TEXT CHECK (default_type IN ('strength', 'cardio')),
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_user_id ON exercise_catalog(user_id);

-- Unicidad case-sensitive como red de seguridad ante inserts concurrentes;
-- el matching case-insensitive real ("Bench Press" vs "bench press") se
-- resuelve en la app con una búsqueda ilike antes de insertar (ver
-- WorkoutExerciseSupabaseRepository.upsertCatalogEntry) — un índice único
-- sobre lower(name) no es un target válido para el onConflict de PostgREST.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_catalog_user_name
  ON exercise_catalog(user_id, name);

ALTER TABLE exercise_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exercise_catalog' AND policyname = 'Users manage own exercise_catalog'
  ) THEN
    CREATE POLICY "Users manage own exercise_catalog" ON exercise_catalog FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Workouts: workouts (the scheduled template — one row per day it's
--    assigned to; day_of_week is singular, 1=lunes..7=domingo, same
--    convention as habits.active_days entries)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workouts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id             UUID REFERENCES categories(id) ON DELETE SET NULL,
  name                    TEXT NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'mixed')),
  day_of_week             INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time              TIME,
  estimated_duration_min  INT CHECK (estimated_duration_min > 0),
  "order"                 INT NOT NULL DEFAULT 0,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_day ON workouts(user_id, day_of_week);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workouts' AND policyname = 'Users manage own workouts'
  ) THEN
    CREATE POLICY "Users manage own workouts" ON workouts FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Workouts: workout_exercises (real FK relation, not an embedded
--    array — order IS live-bound to drag-reorder UI, unlike topics.order)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workout_exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id            UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  catalog_exercise_id   UUID REFERENCES exercise_catalog(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('strength', 'cardio')),
  "order"               INT NOT NULL DEFAULT 0,
  sets                  INT CHECK (sets > 0),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_user_id ON workout_exercises(user_id);

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workout_exercises' AND policyname = 'Users manage own workout_exercises'
  ) THEN
    CREATE POLICY "Users manage own workout_exercises" ON workout_exercises FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Workouts: workout_completions (one per workout per day — mirrors
--    habit_logs' shape; duration_min is optional and never blocks
--    "mark complete")
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workout_completions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id    UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at  DATE NOT NULL,
  duration_min  INT CHECK (duration_min > 0),
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (workout_id, completed_at)
);

CREATE INDEX IF NOT EXISTS idx_workout_completions_user_id ON workout_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_completions_workout_id ON workout_completions(workout_id);

ALTER TABLE workout_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workout_completions' AND policyname = 'Users manage own workout_completions'
  ) THEN
    CREATE POLICY "Users manage own workout_completions" ON workout_completions FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
