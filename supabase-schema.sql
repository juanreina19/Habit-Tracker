-- ============================================================
-- HABIT TRACKER — Esquema completo de base de datos
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Habilitar extensión UUID
create extension if not exists "pgcrypto";

-- ─── CATEGORÍAS ──────────────────────────────────────────────

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  color       text,                    -- hex ej: #FF5733
  icon        text,                    -- nombre icono lucide
  "order"     int not null default 0,
  created_at  timestamptz default now() not null
);

create index idx_categories_user_id on categories(user_id);

-- ─── HÁBITOS ─────────────────────────────────────────────────

create table if not exists habits (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  category_id         uuid references categories(id) on delete set null,
  name                text not null,
  description         text,
  icon                text,
  color               text,
  active_days         int[] not null default '{1,2,3,4,5,6,7}',  -- 1=lunes, 7=domingo
  estimated_minutes   int,
  "order"             int not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz default now() not null
);

create index idx_habits_user_id    on habits(user_id);
create index idx_habits_category   on habits(category_id);
create index idx_habits_is_active  on habits(is_active);

-- ─── REGISTROS DIARIOS ───────────────────────────────────────

create table if not exists habit_logs (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid references habits(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  completed_at  date not null,
  created_at    timestamptz default now() not null,
  unique(habit_id, completed_at)
);

create index idx_habit_logs_habit_id      on habit_logs(habit_id);
create index idx_habit_logs_user_date     on habit_logs(user_id, completed_at desc);

-- ─── RACHAS ──────────────────────────────────────────────────

create table if not exists streaks (
  id                  uuid primary key default gen_random_uuid(),
  habit_id            uuid references habits(id) on delete cascade not null unique,
  user_id             uuid references auth.users(id) on delete cascade not null,
  current_streak      int not null default 0,
  best_streak         int not null default 0,
  last_completed_at   date,
  freeze_used_at      date
);

create index idx_streaks_habit_id on streaks(habit_id);
create index idx_streaks_user_id  on streaks(user_id);

-- ─── CATÁLOGO DE LOGROS ──────────────────────────────────────

create table if not exists achievements (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,   -- ej: 'streak_7', 'perfect_week'
  name        text not null,
  description text not null,
  icon        text not null,
  threshold   int not null
);

-- Insertar los 6 logros del documento
insert into achievements (key, name, description, icon, threshold) values
  ('streak_7',     'Primera llama',   'Racha de 7 días en cualquier hábito',                 '🔥',  7),
  ('streak_30',    'Imparable',       'Racha de 30 días en cualquier hábito',                '⚡',  30),
  ('streak_100',   'Legendario',      'Racha de 100 días en cualquier hábito',               '👑', 100),
  ('perfect_day',  'Día perfecto',    '100% de hábitos completados en un día',               '✨',  1),
  ('perfect_week', 'Semana perfecta', '100% de hábitos completados los 7 días de la semana', '🏆',  7),
  ('consistent_30','Constante',       '30 días completando al menos 1 hábito',               '🎯', 30)
on conflict (key) do nothing;

-- ─── LOGROS DEL USUARIO ──────────────────────────────────────

create table if not exists user_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  achievement_id  uuid references achievements(id) not null,
  habit_id        uuid references habits(id) on delete set null,
  unlocked_at     timestamptz default now() not null,
  unique(user_id, achievement_id, habit_id)
);

create index idx_user_achievements_user_id on user_achievements(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo puede ver y modificar sus propios datos.
-- ============================================================

alter table categories        enable row level security;
alter table habits             enable row level security;
alter table habit_logs         enable row level security;
alter table streaks            enable row level security;
alter table user_achievements  enable row level security;

-- categories
create policy "Users manage own categories"
  on categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- habits
create policy "Users manage own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- habit_logs
create policy "Users manage own logs"
  on habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- streaks
create policy "Users manage own streaks"
  on streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- achievements — lectura pública (catálogo)
create policy "Anyone can read achievements"
  on achievements for select
  using (true);

-- user_achievements
create policy "Users manage own user_achievements"
  on user_achievements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── TAREAS ──────────────────────────────────────────────────

create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null check (char_length(trim(title)) > 0),
  description  text,
  priority     text not null default 'medium'
                 check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz default now() not null
);

alter table tasks enable row level security;

create policy "Users manage own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_tasks_user_id on tasks(user_id);

-- ─── TAREAS — FASE 1.5: RECURRENCIA Y HORARIOS ───────────────
-- Migración aditiva: datos existentes no requieren cambio (recurrence_days = NULL)

alter table tasks
  add column if not exists recurrence_days integer[],   -- NULL=única, [1..7] 1=lun 7=dom
  add column if not exists start_time      time,        -- HH:MM (validación nativa PG)
  add column if not exists end_time        time;        -- HH:MM opcional

create index if not exists idx_tasks_recurrence_days
  on tasks using gin (recurrence_days);

-- ─── COMPLETACIONES DE TAREAS RECURRENTES ────────────────────
-- Equivale a habit_logs pero para tareas recurrentes.
-- Tareas únicas siguen usando completed_at en tasks.

create table if not exists task_completions (
  id              uuid        primary key default gen_random_uuid(),
  task_id         uuid        not null references tasks(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  completed_date  date        not null,
  created_at      timestamptz not null default now(),
  unique (task_id, completed_date)
);

alter table task_completions enable row level security;

create policy "Users manage own task_completions"
  on task_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_task_completions_task_date
  on task_completions(task_id, completed_date);

create index if not exists idx_task_completions_user_date
  on task_completions(user_id, completed_date);
