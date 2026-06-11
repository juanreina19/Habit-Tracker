/**
 * Tipos generados manualmente que reflejan el esquema de Supabase.
 * En producción se pueden auto-generar con: npx supabase gen types typescript
 */

export type UUID = string;
export type ISODate = string; // "YYYY-MM-DD"
export type ISOTimestamp = string; // "YYYY-MM-DDTHH:mm:ssZ"

// ─── Tablas ───────────────────────────────────────────────────────────────────

export interface DbUser {
  id: UUID;
  email: string;
  created_at: ISOTimestamp;
}

export interface DbCategory {
  id: UUID;
  user_id: UUID;
  name: string;
  color: string | null;   // hex ej: "#FF5733"
  icon: string | null;    // nombre del icono (lucide)
  order: number;
  created_at: ISOTimestamp;
}

export interface DbHabit {
  id: UUID;
  user_id: UUID;
  category_id: UUID | null;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  active_days: number[];  // [1..7] donde 1=lunes, 7=domingo
  estimated_minutes: number | null;
  start_time: string | null; // "HH:mm"
  order: number;
  is_active: boolean;
  created_at: ISOTimestamp;
}

export interface DbHabitLog {
  id: UUID;
  habit_id: UUID;
  user_id: UUID;
  completed_at: ISODate;
  created_at: ISOTimestamp;
}

export interface DbStreak {
  id: UUID;
  habit_id: UUID;
  user_id: UUID;
  current_streak: number;
  best_streak: number;
  last_completed_at: ISODate | null;
  freeze_used_at: ISODate | null;
}

export interface DbAchievement {
  id: UUID;
  key: string;            // ej: 'streak_7', 'perfect_week'
  name: string;
  description: string;
  icon: string;
  threshold: number;
}

export interface DbUserAchievement {
  id: UUID;
  user_id: UUID;
  achievement_id: UUID;
  habit_id: UUID | null;
  unlocked_at: ISOTimestamp;
}

export interface DbPushSubscription {
  id: UUID;
  user_id: UUID;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: ISOTimestamp;
}

export interface DbTask {
  id: UUID;
  user_id: UUID;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: ISODate | null;
  recurrence_days: number[] | null;  // null=única, [1..7]=recurrente
  start_time: string | null;         // "HH:MM:SS" (Supabase devuelve TIME como string)
  end_time: string | null;           // "HH:MM:SS"
  completed_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
  icon: string | null;               // "lucide:Name"; null = sin icono
  focus_duration_min: number | null;
}

export interface DbTaskCompletion {
  id: UUID;
  task_id: UUID;
  user_id: UUID;
  completed_date: ISODate;
  created_at: ISOTimestamp;
}

export interface DbFocusSession {
  id: UUID;
  task_id: UUID;
  user_id: UUID;
  duration_min: number;
  started_at: ISOTimestamp;
  ended_at: ISOTimestamp;
  elapsed_sec: number;
  status: "completed" | "abandoned";
  created_at: ISOTimestamp;
}

// ─── Helper para Supabase client tipado ──────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: DbCategory;
        Insert: Omit<DbCategory, "id" | "created_at">;
        Update: Partial<Omit<DbCategory, "id" | "user_id" | "created_at">>;
      };
      habits: {
        Row: DbHabit;
        Insert: Omit<DbHabit, "id" | "created_at">;
        Update: Partial<Omit<DbHabit, "id" | "user_id" | "created_at">>;
      };
      habit_logs: {
        Row: DbHabitLog;
        Insert: Omit<DbHabitLog, "id" | "created_at">;
        Update: never;
      };
      streaks: {
        Row: DbStreak;
        Insert: Omit<DbStreak, "id">;
        Update: Partial<Omit<DbStreak, "id" | "habit_id" | "user_id">>;
      };
      achievements: {
        Row: DbAchievement;
        Insert: Omit<DbAchievement, "id">;
        Update: Partial<Omit<DbAchievement, "id">>;
      };
      user_achievements: {
        Row: DbUserAchievement;
        Insert: Omit<DbUserAchievement, "id">;
        Update: never;
      };
      push_subscriptions: {
        Row: DbPushSubscription;
        Insert: Omit<DbPushSubscription, "id" | "created_at">;
        Update: never;
      };
      tasks: {
        Row: DbTask;
        Insert: Omit<DbTask, "id" | "created_at">;
        Update: Partial<Omit<DbTask, "id" | "user_id" | "created_at">>;
      };
      task_completions: {
        Row: DbTaskCompletion;
        Insert: Omit<DbTaskCompletion, "id" | "created_at">;
        Update: never;
      };
      focus_sessions: {
        Row: DbFocusSession;
        Insert: Omit<DbFocusSession, "id" | "created_at">;
        Update: never;  // append-only, igual que task_completions
      };
    };
  };
}
