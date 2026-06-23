-- Migration: UI Redesign — Eisenhower, Kanban, Studies
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS patterns)

-- ═══════════════════════════════════════════════════════════════════
-- 1. Tasks: Eisenhower importance flag
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Tasks: Kanban status column
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'todo';
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('todo', 'in_progress', 'done'));
  END IF;
END $$;

-- Backfill: completed tasks get status='done'
UPDATE tasks SET status = 'done' WHERE completed_at IS NOT NULL AND status = 'todo';

-- ═══════════════════════════════════════════════════════════════════
-- 3. Studies module: subjects
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Users manage own subjects'
  ) THEN
    CREATE POLICY "Users manage own subjects" ON subjects FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Studies module: topics
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  "order"     INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'topics' AND policyname = 'Users manage own topics'
  ) THEN
    CREATE POLICY "Users manage own topics" ON topics FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. Studies module: study_sessions
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS study_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id    UUID REFERENCES topics(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  duration_min INT NOT NULL CHECK (duration_min > 0),
  started_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON study_sessions(subject_id);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'study_sessions' AND policyname = 'Users manage own study_sessions'
  ) THEN
    CREATE POLICY "Users manage own study_sessions" ON study_sessions FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
