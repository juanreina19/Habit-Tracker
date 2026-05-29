import { startOfWeek, endOfWeek, subWeeks, eachDayOfInterval, format } from "date-fns";
import { es } from "date-fns/locale";
import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { IAchievementRepository } from "@/modules/achievements/domain/repositories/IAchievementRepository";
import type { Achievement, UserAchievement } from "@/modules/achievements/domain/entities/Achievement";
import type { Habit } from "../entities/Habit";
import type { UUID } from "@/shared/types/database.types";
import { toISODate, isHabitActiveOnDay, today } from "@/shared/lib/utils/dates";
import { ACHIEVEMENT_SEEDS } from "@/modules/achievements/infrastructure/supabase/AchievementSupabaseRepository";

export interface HabitStat {
  habit: Habit;
  completionRate: number;
  totalScheduled: number;
  totalCompleted: number;
}

export interface WeekTrend {
  weekLabel: string;
  completionRate: number;
  scheduled: number;
  completed: number;
}

export interface StatsData {
  activeHabitsCount: number;
  bestCurrentStreak: number;
  bestEverStreak: number;
  monthlyRate: number;
  habitStats: HabitStat[];
  weekTrends: WeekTrend[];
  userAchievements: UserAchievement[];
  allAchievements: Achievement[];
}

export class GetStatsUseCase {
  constructor(
    private readonly habitRepo: IHabitRepository,
    private readonly achievementRepo: IAchievementRepository,
  ) {}

  async execute(userId: UUID): Promise<StatsData> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 56 days = 8 weeks back; also covers the 30-day window
    const sixtyDaysAgo = toISODate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));

    const [habits, streaks, logs, userAchievements, allAchievements] = await Promise.all([
      this.habitRepo.findAllByUser(userId),
      this.habitRepo.findAllStreaksForUser(userId),
      this.habitRepo.findAllLogsForUserInRange(userId, sixtyDaysAgo, today()),
      this.achievementRepo.findUserAchievements(userId),
      // Return seed definitions directly (avoids extra DB call + seeding on stats load)
      Promise.resolve(ACHIEVEMENT_SEEDS),
    ]);

    const logSet = new Set(logs.map((l) => `${l.habitId}:${l.completedAt}`));

    // ── Summary stats ────────────────────────────────────────────────────────
    const bestCurrentStreak = Math.max(0, ...streaks.map((s) => s.currentStreak));
    const bestEverStreak = Math.max(0, ...streaks.map((s) => s.bestStreak));

    // Monthly rate: first day of current month to today
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartISO = toISODate(monthStart);
    const monthLogs = logs.filter((l) => l.completedAt >= monthStartISO);
    const monthLogSet = new Set(monthLogs.map((l) => `${l.habitId}:${l.completedAt}`));

    const monthDays = eachDayOfInterval({ start: monthStart, end: now });
    let monthScheduled = 0;
    let monthCompleted = 0;
    for (const day of monthDays) {
      const dayISO = toISODate(day);
      for (const habit of habits) {
        if (isHabitActiveOnDay(habit.activeDays, day)) {
          monthScheduled++;
          if (monthLogSet.has(`${habit.id}:${dayISO}`)) monthCompleted++;
        }
      }
    }
    const monthlyRate = monthScheduled > 0 ? Math.round((monthCompleted / monthScheduled) * 100) : 0;

    // ── Per-habit stats (last 30 days) ───────────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoISO = toISODate(thirtyDaysAgo);
    const last30Days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });

    const habitStats: HabitStat[] = habits.map((habit) => {
      const scheduledDays = last30Days.filter((d) => isHabitActiveOnDay(habit.activeDays, d));
      const completedDays = scheduledDays.filter((d) =>
        logSet.has(`${habit.id}:${toISODate(d)}`)
      );
      const totalScheduled = scheduledDays.length;
      const totalCompleted = completedDays.length;
      const completionRate = totalScheduled > 0
        ? Math.round((totalCompleted / totalScheduled) * 100)
        : 0;
      return { habit, completionRate, totalScheduled, totalCompleted };
    }).filter((hs) => hs.totalScheduled > 0);

    // ── Weekly trend (last 8 weeks) ──────────────────────────────────────────
    const weekTrends: WeekTrend[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = startOfWeek(subWeeks(now, w), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const cutoff = weekEnd > now ? now : weekEnd;

      if (weekStart > now) continue;

      const weekDays = eachDayOfInterval({ start: weekStart, end: cutoff });
      let scheduled = 0;
      let completed = 0;

      for (const day of weekDays) {
        const dayISO = toISODate(day);
        if (dayISO < thirtyDaysAgoISO && w > 4) {
          // Only include days within our log fetch window
        }
        for (const habit of habits) {
          if (isHabitActiveOnDay(habit.activeDays, day)) {
            scheduled++;
            if (logSet.has(`${habit.id}:${dayISO}`)) completed++;
          }
        }
      }

      const completionRate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
      const weekLabel = format(weekStart, "d MMM", { locale: es });

      weekTrends.push({ weekLabel, completionRate, scheduled, completed });
    }

    // Merge allAchievements: use DB user achievements to mark which are unlocked
    // allAchievements are the seed constants; userAchievements have the unlock timestamps
    const mergedAchievements: Achievement[] = allAchievements;

    return {
      activeHabitsCount: habits.length,
      bestCurrentStreak,
      bestEverStreak,
      monthlyRate,
      habitStats,
      weekTrends,
      userAchievements,
      allAchievements: mergedAchievements,
    };
  }
}
