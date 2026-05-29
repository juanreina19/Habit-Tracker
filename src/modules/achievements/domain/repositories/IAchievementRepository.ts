import type { UUID } from "@/shared/types/database.types";
import type { Achievement, UserAchievement } from "../entities/Achievement";

export interface IAchievementRepository {
  findAll(): Promise<Achievement[]>;
  findUserAchievements(userId: UUID): Promise<UserAchievement[]>;
  unlock(userId: UUID, achievementId: UUID, habitId?: UUID): Promise<UserAchievement>;
  isUnlocked(userId: UUID, achievementKey: string): Promise<boolean>;
}
