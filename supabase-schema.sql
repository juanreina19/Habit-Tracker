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

-- ─── TAREAS — FASE 2: ICONOS ─────────────────────────────────
-- Las filas existentes quedan con icon = NULL ("sin icono").

alter table tasks
  add column if not exists icon text;                   -- "lucide:Name"; null = sin icono

create index if not exists idx_tasks_recurrence_days
  on tasks using gin (recurrence_days);

-- ─── TAREAS — FOCUS MODE POR TAREA (ELIMINADO) ───────────────
-- El Focus Mode pasó a ser global (ver focus_mode_sessions más abajo);
-- ya no se configura por tarea ni se persiste historial de sesiones.

alter table tasks
  drop column if exists focus_duration_min,
  drop column if exists sessions_goal,
  drop column if exists short_break_min,
  drop column if exists long_break_min,
  drop column if exists long_break_interval,
  drop column if exists auto_start_short_break,
  drop column if exists auto_start_long_break,
  drop column if exists auto_start_next;

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

-- ─── SESIONES DE ENFOQUE (POMODORO) — ELIMINADO ──────────────
-- Ya no se registra historial de sesiones finalizadas; el Focus Mode global
-- no persiste sesiones, solo el estado de la sesión activa (ver
-- focus_mode_sessions más abajo).

drop function if exists count_focus_sessions_by_task(uuid[], timestamptz);
drop table if exists focus_sessions;


-- ============================================================
-- WEBHOOKS — Tablas, triggers y funciones (módulo Tasks)
-- ============================================================

-- ─── ENDPOINTS DE WEBHOOK (configurados por el usuario) ──────

create table if not exists webhook_endpoints (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  url           text        not null check (url ~ '^https://'),
  description   text,                         -- ej: "Zapier - Notion sync"
  secret        text        not null,          -- HMAC-SHA256, ver firma de payloads
  event_types   text[]      not null default
                  array['task.created','task.updated','task.completed','task.uncompleted','task.deleted']
                  check (event_types <@ array['task.created','task.updated','task.completed','task.uncompleted','task.deleted']),
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  -- Denormalizado para la UI de Settings sin JOIN
  last_triggered_at    timestamptz,
  last_status          text check (last_status in ('success','failed')),
  consecutive_failures int not null default 0
);

alter table webhook_endpoints enable row level security;

create policy "Users manage own webhook_endpoints"
  on webhook_endpoints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_webhook_endpoints_user_id on webhook_endpoints(user_id);
create index if not exists idx_webhook_endpoints_active on webhook_endpoints(user_id) where is_active;


-- ─── OUTBOX: EVENTOS DE TAREAS (escrito SOLO por triggers) ───
-- Append-only. Cada fila = un hecho de dominio ya confirmado
-- (misma transacción que la mutación de tasks/task_completions).

create table if not exists webhook_events (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  event_type    text        not null
                  check (event_type in ('task.created','task.updated','task.completed','task.uncompleted','task.deleted')),
  task_id       uuid        not null,         -- sin FK: task.deleted ocurre tras el DELETE de tasks
  payload       jsonb       not null,          -- payload "delgado", forma según event_type
  created_at    timestamptz not null default now(),
  -- 'pending'   : aún no se intentó para ningún endpoint activo
  -- 'delivered' : entregado (o no había endpoints activos) — terminal
  -- 'failed'    : se agotaron los reintentos para algún endpoint — terminal pero visible
  dispatch_status text not null default 'pending'
                  check (dispatch_status in ('pending','delivered','failed'))
);

alter table webhook_events enable row level security;

-- Lectura: el usuario audita "qué eventos se generaron" (Settings → Webhooks → Activity).
-- Sin policy de insert/update/delete para usuarios: estas filas las crea el trigger
-- (security definer) y las actualiza el cron (service role, bypassa RLS).
create policy "Users read own webhook_events"
  on webhook_events for select
  using (auth.uid() = user_id);

create index if not exists idx_webhook_events_dispatch
  on webhook_events(dispatch_status, created_at) where dispatch_status = 'pending';

create index if not exists idx_webhook_events_user_id on webhook_events(user_id, created_at desc);


-- ─── DELIVERIES: INTENTOS DE ENTREGA POR (EVENTO, ENDPOINT) ──

create table if not exists webhook_deliveries (
  id              uuid        primary key default gen_random_uuid(),
  event_id        uuid        not null references webhook_events(id) on delete cascade,
  endpoint_id     uuid        not null references webhook_endpoints(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  status          text        not null default 'pending'
                    check (status in ('pending','success','failed')),
  attempt_count   int         not null default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),  -- cuándo el cron debe reintentar
  response_status int,                                  -- HTTP status de la última respuesta
  response_body   text,                                 -- primeros ~500 chars, debugging
  created_at      timestamptz not null default now(),
  -- Idempotencia de creación: una sola fila de delivery por (evento, endpoint)
  unique (event_id, endpoint_id)
);

alter table webhook_deliveries enable row level security;

create policy "Users read own webhook_deliveries"
  on webhook_deliveries for select
  using (auth.uid() = user_id);

create index if not exists idx_webhook_deliveries_due
  on webhook_deliveries(next_attempt_at) where status in ('pending');

create index if not exists idx_webhook_deliveries_user_id on webhook_deliveries(user_id, created_at desc);
create index if not exists idx_webhook_deliveries_event_id on webhook_deliveries(event_id);


-- ============================================================
-- TRIGGER: tasks → webhook_events
-- ============================================================
-- security definer + search_path fijo: el usuario autenticado NO tiene
-- INSERT en webhook_events (solo SELECT), pero el trigger debe escribir
-- ahí dentro de SU transacción. search_path fijo evita ataques de
-- search-path hijacking (mitigación estándar para security definer).
-- Si el ÚNICO cambio de un UPDATE es completed_at, NO se emite también
-- task.updated: sería un doble disparo para la misma acción del usuario
-- (completar/descompletar ya genera task.completed/task.uncompleted).
create or replace function fn_tasks_webhook_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_field text;
  v_tracked_fields text[] := array['title','description','priority','due_date',
    'recurrence_days','start_time','end_time','icon'];
begin
  if TG_OP = 'INSERT' then
    insert into webhook_events (user_id, event_type, task_id, payload)
    values (NEW.user_id, 'task.created', NEW.id, jsonb_build_object(
      'id', NEW.id, 'title', NEW.title, 'priority', NEW.priority,
      'dueDate', NEW.due_date, 'recurrenceDays', NEW.recurrence_days,
      'createdAt', NEW.created_at
    ));
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    -- task.completed / task.uncompleted (tareas únicas vía completed_at)
    if OLD.completed_at is null and NEW.completed_at is not null then
      insert into webhook_events (user_id, event_type, task_id, payload)
      values (NEW.user_id, 'task.completed', NEW.id, jsonb_build_object(
        'id', NEW.id, 'title', NEW.title, 'completedAt', NEW.completed_at, 'recurring', false
      ));
    elsif OLD.completed_at is not null and NEW.completed_at is null then
      insert into webhook_events (user_id, event_type, task_id, payload)
      values (NEW.user_id, 'task.uncompleted', NEW.id, jsonb_build_object(
        'id', NEW.id, 'title', NEW.title, 'recurring', false
      ));
    end if;

    -- ¿Cambios en campos editables además de completed_at?
    foreach v_field in array v_tracked_fields loop
      if to_jsonb(OLD) -> v_field is distinct from to_jsonb(NEW) -> v_field then
        v_changes := v_changes || jsonb_build_object(v_field,
          jsonb_build_object('old', to_jsonb(OLD) -> v_field, 'new', to_jsonb(NEW) -> v_field));
      end if;
    end loop;

    if v_changes <> '{}'::jsonb then
      insert into webhook_events (user_id, event_type, task_id, payload)
      values (NEW.user_id, 'task.updated', NEW.id, jsonb_build_object(
        'id', NEW.id, 'title', NEW.title, 'changes', v_changes
      ));
    end if;

    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into webhook_events (user_id, event_type, task_id, payload)
    values (OLD.user_id, 'task.deleted', OLD.id, jsonb_build_object(
      'id', OLD.id, 'title', OLD.title
    ));
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_tasks_webhook_event on tasks;
create trigger trg_tasks_webhook_event
  after insert or update or delete on tasks
  for each row execute function fn_tasks_webhook_event();


-- ============================================================
-- TRIGGER: task_completions → webhook_events (tareas recurrentes)
-- ============================================================
-- Misma justificación de security definer que fn_tasks_webhook_event().

create or replace function fn_task_completions_webhook_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if TG_OP = 'INSERT' then
    select title into v_title from tasks where id = NEW.task_id;
    insert into webhook_events (user_id, event_type, task_id, payload)
    values (NEW.user_id, 'task.completed', NEW.task_id, jsonb_build_object(
      'id', NEW.task_id, 'title', v_title, 'completedAt', NEW.created_at,
      'completedDate', NEW.completed_date, 'recurring', true
    ));
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    select title into v_title from tasks where id = OLD.task_id;
    insert into webhook_events (user_id, event_type, task_id, payload)
    values (OLD.user_id, 'task.uncompleted', OLD.task_id, jsonb_build_object(
      'id', OLD.task_id, 'title', v_title, 'completedDate', OLD.completed_date, 'recurring', true
    ));
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_task_completions_webhook_event on task_completions;
create trigger trg_task_completions_webhook_event
  after insert or delete on task_completions
  for each row execute function fn_task_completions_webhook_event();

-- ─── SESIÓN DE ENFOQUE ACTIVA POR TAREA — ELIMINADO ──────────
-- Reemplazado por focus_mode_sessions (Focus Mode global, sin tarea asociada
-- a la sesión y sin historial).

drop table if exists active_focus_sessions;

-- ─── FOCUS MODE GLOBAL — SESIÓN ACTIVA (CROSS-DEVICE) ────────
-- Una fila por usuario = el "timer en curso" del Focus Mode global,
-- sincronizado entre dispositivos vía Realtime. user_id como PK garantiza
-- una sola sesión activa por usuario (insert falla con 23505 si ya hay una;
-- el cliente "perdedor" de una carrera adopta la fila existente).
-- Ciclo Pomodoro indefinido (sin meta): focus -> short_break/long_break -> focus...
-- según session_index % long_break_interval. No se persiste historial.

create table if not exists focus_mode_sessions (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  client_session_id       uuid not null,
  task_ids                uuid[] not null default '{}',
  phase                   text not null default 'focus'
                            check (phase in ('focus','short_break','long_break')),
  session_index           int not null default 1 check (session_index >= 1),
  focus_duration_min      int not null check (focus_duration_min > 0),
  short_break_min         int not null check (short_break_min > 0),
  long_break_min          int not null check (long_break_min > 0),
  long_break_interval     int not null check (long_break_interval >= 1),
  auto_start_short_break  boolean not null default false,
  auto_start_long_break   boolean not null default false,
  duration_min            int not null check (duration_min > 0),
  started_at              timestamptz not null,
  paused_at               timestamptz,
  accumulated_sec         int not null default 0 check (accumulated_sec >= 0),
  updated_at              timestamptz not null default now()
);

alter table focus_mode_sessions enable row level security;

create policy "Users manage own focus_mode_sessions"
  on focus_mode_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Privilegio a nivel de tabla para el rol de la API (RLS sigue filtrando por fila).
grant select, insert, update, delete on focus_mode_sessions to authenticated;

-- ─── SUBTAREAS ────────────────────────────────────────────────
-- Subtareas opcionales de una tarea, sin meta de progreso global:
-- "order" define el orden manual de la lista.

create table if not exists subtasks (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references tasks(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null check (char_length(trim(title)) > 0),
  is_completed  boolean not null default false,
  "order"       int not null default 0,
  created_at    timestamptz not null default now()
);

alter table subtasks enable row level security;

create policy "Users manage own subtasks"
  on subtasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_subtasks_task_id on subtasks(task_id);

grant select, insert, update, delete on subtasks to authenticated;

-- RPC: conteo de subtareas totales/completadas por tarea, filtrado por el
-- usuario autenticado (security invoker -> respeta RLS de subtasks).
create or replace function count_subtasks_by_task(p_task_ids uuid[])
returns table (task_id uuid, total bigint, completed bigint)
language sql
stable
security invoker
as $$
  select task_id, count(*) as total, count(*) filter (where is_completed) as completed
  from subtasks
  where user_id = auth.uid() and task_id = any(p_task_ids)
  group by task_id;
$$;
