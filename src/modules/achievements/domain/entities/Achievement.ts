import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export type AchievementKey =
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "perfect_day"
  | "perfect_week"
  | "consistent_30";

export interface Achievement {
  id: UUID;
  key: AchievementKey;
  name: string;
  description: string;
  icon: string;
  threshold: number;
}

export interface UserAchievement {
  id: UUID;
  userId: UUID;
  achievementId: UUID;
  habitId: UUID | null;
  unlockedAt: ISOTimestamp;
  achievement: Achievement;
}
