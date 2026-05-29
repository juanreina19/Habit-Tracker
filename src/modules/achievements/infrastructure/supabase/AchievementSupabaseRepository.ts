import type { SupabaseClient } from "@supabase/supabase-js";
import type { IAchievementRepository } from "../../domain/repositories/IAchievementRepository";
import type { Achievement, UserAchievement, AchievementKey } from "../../domain/entities/Achievement";
import type { UUID } from "@/shared/types/database.types";

// Fixed UUIDs so we can safely upsert without a unique index on `key`
export const ACHIEVEMENT_SEEDS: Achievement[] = [
  { id: "a0000000-0000-0000-0000-000000000001", key: "streak_7",      name: "Primera Llama",   description: "Completa un hábito 7 días seguidos",        icon: "🔥", threshold: 7   },
  { id: "a0000000-0000-0000-0000-000000000002", key: "streak_30",     name: "Imparable",       description: "Completa un hábito 30 días seguidos",       icon: "⚡", threshold: 30  },
  { id: "a0000000-0000-0000-0000-000000000003", key: "streak_100",    name: "Legendario",      description: "Completa un hábito 100 días seguidos",      icon: "👑", threshold: 100 },
  { id: "a0000000-0000-0000-0000-000000000004", key: "perfect_day",   name: "Día Perfecto",    description: "100% de hábitos completados en un día",     icon: "⭐", threshold: 1   },
  { id: "a0000000-0000-0000-0000-000000000005", key: "perfect_week",  name: "Semana Perfecta", description: "100% completado todos los días de una semana", icon: "🌟", threshold: 7 },
  { id: "a0000000-0000-0000-0000-000000000006", key: "consistent_30", name: "Constante",       description: "Completa hábitos en 30 días distintos",     icon: "💎", threshold: 30  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AchievementSupabaseRepository implements IAchievementRepository {
  constructor(private readonly client: SupabaseClient<any>) {}

  private async ensureSeeded(): Promise<void> {
    await this.client
      .from("achievements")
      .upsert(
        ACHIEVEMENT_SEEDS.map((a) => ({
          id: a.id,
          key: a.key,
          name: a.name,
          description: a.description,
          icon: a.icon,
          threshold: a.threshold,
        })),
        { onConflict: "id", ignoreDuplicates: true }
      );
  }

  async findAll(): Promise<Achievement[]> {
    await this.ensureSeeded();
    const { data, error } = await this.client.from("achievements").select("*");
    if (error) throw error;
    return data.map(mapDbToAchievement);
  }

  async findUserAchievements(userId: UUID): Promise<UserAchievement[]> {
    const { data, error } = await this.client
      .from("user_achievements")
      .select("*, achievement:achievements(*)")
      .eq("user_id", userId);

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      habitId: row.habit_id,
      unlockedAt: row.unlocked_at,
      achievement: mapDbToAchievement(row.achievement),
    }));
  }

  async unlock(userId: UUID, achievementId: UUID, habitId?: UUID): Promise<UserAchievement> {
    const { data, error } = await this.client
      .from("user_achievements")
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        habit_id: habitId ?? null,
      })
      .select("*, achievement:achievements(*)")
      .single();

    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      achievementId: data.achievement_id,
      habitId: data.habit_id,
      unlockedAt: data.unlocked_at,
      achievement: mapDbToAchievement(data.achievement),
    };
  }

  async isUnlocked(userId: UUID, achievementKey: string): Promise<boolean> {
    const seed = ACHIEVEMENT_SEEDS.find((a) => a.key === achievementKey);
    if (!seed) return false;
    const { count } = await this.client
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("achievement_id", seed.id);
    return (count ?? 0) > 0;
  }
}

function mapDbToAchievement(row: {
  id: string; key: string; name: string; description: string; icon: string; threshold: number;
}): Achievement {
  return {
    id: row.id,
    key: row.key as AchievementKey,
    name: row.name,
    description: row.description,
    icon: row.icon,
    threshold: row.threshold,
  };
}
