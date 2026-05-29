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
    };
  };
}
