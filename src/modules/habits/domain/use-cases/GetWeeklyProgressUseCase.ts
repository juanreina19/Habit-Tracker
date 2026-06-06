import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { Habit, Streak } from "../entities/Habit";
import type { UUID } from "@/shared/types/database.types";
import { toISODate, isHabitActiveOnDay } from "@/shared/lib/utils/dates";

export interface DayStatus {
  date: Date;
  isScheduled: boolean;
  isCompleted: boolean;
  isFuture: boolean;
}

export interface WeeklyHabitProgress {
  habit: Habit;
  streak: Streak | null;
  days: DayStatus[];
  completionRate: number;
}

export interface WeeklyProgress {
  weekDays: Date[];
  habits: WeeklyHabitProgress[];
  globalRate: number;
  totalCompleted: number;
  totalScheduled: number;
}

export class GetWeeklyProgressUseCase {
  constructor(private readonly habitRepo: IHabitRepository) {}

  /** weekStart defaults to the current week's Monday if not provided */
  async execute(userId: UUID, weekStart?: Date): Promise<WeeklyProgress> {
    const start = weekStart ?? startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start,
      end: endOfWeek(start, { weekStartsOn: 1 }),
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const weekStartISO = toISODate(weekDays[0]);
    const weekEndISO = toISODate(weekDays[6]);

    const [habits, allLogs, allStreaks] = await Promise.all([
      this.habitRepo.findAllByUser(userId),
      this.habitRepo.findAllLogsForUserInRange(userId, weekStartISO, weekEndISO),
      this.habitRepo.findAllStreaksForUser(userId),
    ]);

    const streakMap = new Map(allStreaks.map((s) => [s.habitId, s]));
    const logSet = new Set(allLogs.map((l) => `${l.habitId}:${l.completedAt}`));

    let totalScheduled = 0;
    let totalCompleted = 0;

    const habitProgressList: WeeklyHabitProgress[] = habits
      .map((habit) => {
        const days: DayStatus[] = weekDays.map((date) => {
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);

          const isFuture = dayStart > now;
          const isScheduled = isHabitActiveOnDay(habit.activeDays, date, habit.createdAt);
          const isCompleted = isScheduled && logSet.has(`${habit.id}:${toISODate(date)}`);
          return { date, isScheduled, isCompleted, isFuture };
        });

        const scheduledPast = days.filter((d) => d.isScheduled && !d.isFuture);
        const completed = days.filter((d) => d.isCompleted);

        totalScheduled += scheduledPast.length;
        totalCompleted += completed.length;

        const completionRate =
          scheduledPast.length > 0
            ? Math.round((completed.length / scheduledPast.length) * 100)
            : 0;

        return { habit, streak: streakMap.get(habit.id) ?? null, days, completionRate };
      })
      .filter((hp) => hp.days.some((d) => d.isScheduled));

    const globalRate =
      totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    return { weekDays, habits: habitProgressList, globalRate, totalCompleted, totalScheduled };
  }
}
