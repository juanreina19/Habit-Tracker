import { startOfWeek, endOfWeek, subWeeks, eachDayOfInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { IHabitRepository } from "@/modules/habits/domain/repositories/IHabitRepository";
import type { IAchievementRepository } from "../repositories/IAchievementRepository";
import type { UserAchievement, AchievementKey } from "../entities/Achievement";
import type { UUID } from "@/shared/types/database.types";
import { toISODate, isHabitActiveOnDay, today } from "@/shared/lib/utils/dates";
import { ACHIEVEMENT_SEEDS } from "../../infrastructure/supabase/AchievementSupabaseRepository";

export class CheckAndUnlockAchievementsUseCase {
  constructor(
    private readonly habitRepo: IHabitRepository,
    private readonly achievementRepo: IAchievementRepository,
  ) {}

  async execute(userId: UUID): Promise<UserAchievement[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Fetch data in parallel
    const ninetyDaysAgo = toISODate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const [habits, streaks, recentLogs, userAchievements] = await Promise.all([
      this.habitRepo.findAllByUser(userId),
      this.habitRepo.findAllStreaksForUser(userId),
      this.habitRepo.findAllLogsForUserInRange(userId, ninetyDaysAgo, today()),
      this.achievementRepo.findUserAchievements(userId),
    ]);

    const alreadyUnlockedKeys = new Set(userAchievements.map((ua) => ua.achievement.key));
    const newlyUnlocked: UserAchievement[] = [];

    const logSet = new Set(recentLogs.map((l) => `${l.habitId}:${l.completedAt}`));

    // ── Helper: check if a day was 100% complete ─────────────────────────────
    const wasDayComplete = (date: Date): boolean => {
      const dateKey = toISODate(date);
      const scheduled = habits.filter((h) => isHabitActiveOnDay(h.activeDays, date));
      if (scheduled.length === 0) return false;
      return scheduled.every((h) => logSet.has(`${h.id}:${dateKey}`));
    };

    // ── streak_7 / streak_30 / streak_100 ────────────────────────────────────
    const maxCurrentStreak = Math.max(0, ...streaks.map((s) => s.currentStreak));

    const streakAchievements: Array<{ key: AchievementKey; threshold: number }> = [
      { key: "streak_7",   threshold: 7   },
      { key: "streak_30",  threshold: 30  },
      { key: "streak_100", threshold: 100 },
    ];

    for (const { key, threshold } of streakAchievements) {
      if (alreadyUnlockedKeys.has(key)) continue;
      const qualifyingStreak = streaks.find((s) => s.currentStreak >= threshold);
      if (!qualifyingStreak) continue;

      const seed = ACHIEVEMENT_SEEDS.find((a) => a.key === key)!;
      try {
        const ua = await this.achievementRepo.unlock(userId, seed.id, qualifyingStreak.habitId);
        newlyUnlocked.push(ua);
        alreadyUnlockedKeys.add(key);
      } catch {
        // Already unlocked by a concurrent request — ignore
      }
    }

    // ── perfect_day ──────────────────────────────────────────────────────────
    if (!alreadyUnlockedKeys.has("perfect_day") && wasDayComplete(now)) {
      const seed = ACHIEVEMENT_SEEDS.find((a) => a.key === "perfect_day")!;
      try {
        const ua = await this.achievementRepo.unlock(userId, seed.id);
        newlyUnlocked.push(ua);
        alreadyUnlockedKeys.add("perfect_day");
      } catch { /* already unlocked */ }
    }

    // ── perfect_week ─────────────────────────────────────────────────────────
    if (!alreadyUnlockedKeys.has("perfect_week")) {
      const checkWeekPerfect = (weekStart: Date): boolean => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const cutoff = now < weekEnd ? now : weekEnd;
        const days = eachDayOfInterval({ start: weekStart, end: cutoff });
        return days.length === 7 && days.every((d) => wasDayComplete(d));
      };

      // Check last 2 full weeks
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const prevWeekStart = subWeeks(thisWeekStart, 1);

      const isPerfect =
        checkWeekPerfect(prevWeekStart) ||
        (now >= endOfWeek(thisWeekStart, { weekStartsOn: 1 }) && checkWeekPerfect(thisWeekStart));

      if (isPerfect) {
        const seed = ACHIEVEMENT_SEEDS.find((a) => a.key === "perfect_week")!;
        try {
          const ua = await this.achievementRepo.unlock(userId, seed.id);
          newlyUnlocked.push(ua);
          alreadyUnlockedKeys.add("perfect_week");
        } catch { /* already unlocked */ }
      }
    }

    // ── consistent_30 ────────────────────────────────────────────────────────
    if (!alreadyUnlockedKeys.has("consistent_30")) {
      const distinctDays = new Set(recentLogs.map((l) => l.completedAt)).size;
      if (distinctDays >= 30) {
        const seed = ACHIEVEMENT_SEEDS.find((a) => a.key === "consistent_30")!;
        try {
          const ua = await this.achievementRepo.unlock(userId, seed.id);
          newlyUnlocked.push(ua);
        } catch { /* already unlocked */ }
      }
    }

    // ── comeback ─────────────────────────────────────────────────────────────
    // Award when currentStreak >= 3 AND bestStreak > currentStreak (streak was broken and rebuilt)
    if (!alreadyUnlockedKeys.has("comeback")) {
      const qualifyingComeback = streaks.find(
        (s) => s.currentStreak >= 3 && s.bestStreak > s.currentStreak && s.bestStreak >= 7
      );
      if (qualifyingComeback) {
        const seed = ACHIEVEMENT_SEEDS.find((a) => a.key === "comeback")!;
        try {
          const ua = await this.achievementRepo.unlock(userId, seed.id, qualifyingComeback.habitId);
          newlyUnlocked.push(ua);
          alreadyUnlockedKeys.add("comeback");
        } catch { /* already unlocked */ }
      }
    }

    // ── perfect_month ────────────────────────────────────────────────────────
    // Award when every active day of the previous calendar month was 100% complete
    if (!alreadyUnlockedKeys.has("perfect_month")) {
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = endOfMonth(prevMonthStart);
      const prevMonthDays = eachDayOfInterval({ start: prevMonthStart, end: prevMonthEnd });

      const activeDays = prevMonthDays.filter((d) => {
        return habits.some((h) => isHabitActiveOnDay(h.activeDays, d));
      });

      if (activeDays.length > 0 && activeDays.every((d) => wasDayComplete(d))) {
        const seed = ACHIEVEMENT_SEEDS.find((a) => a.key === "perfect_month")!;
        try {
          const ua = await this.achievementRepo.unlock(userId, seed.id);
          newlyUnlocked.push(ua);
          alreadyUnlockedKeys.add("perfect_month");
        } catch { /* already unlocked */ }
      }
    }

    return newlyUnlocked;
  }
}
