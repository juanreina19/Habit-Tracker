import type { UUID, ISODate, ISOTimestamp } from "@/shared/types/database.types";

export interface Habit {
  id: UUID;
  userId: UUID;
  categoryId: UUID | null;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  activeDays: number[];       // [1..7] 1=lunes, 7=domingo
  estimatedMinutes: number | null;
  startTime: string | null;  // "HH:mm"
  order: number;
  isActive: boolean;
  createdAt: ISOTimestamp;
}

export interface HabitLog {
  id: UUID;
  habitId: UUID;
  userId: UUID;
  completedAt: ISODate;
  createdAt: ISOTimestamp;
}

export interface Streak {
  id: UUID;
  habitId: UUID;
  userId: UUID;
  currentStreak: number;
  bestStreak: number;
  lastCompletedAt: ISODate | null;
  freezeUsedAt: ISODate | null;
}

/** Hábito enriquecido con datos de racha y estado del día */
export interface HabitWithStatus extends Habit {
  streak: Streak | null;
  isCompletedToday: boolean;
}
