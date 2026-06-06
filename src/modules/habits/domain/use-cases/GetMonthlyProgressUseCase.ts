import { eachDayOfInterval } from "date-fns";
import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { UUID } from "@/shared/types/database.types";
import { toISODate, isHabitActiveOnDay } from "@/shared/lib/utils/dates";

export interface DayProgress {
  date: Date;
  /** 0-100, or -1 if no habits scheduled that day */
  completionRate: number;
  scheduled: number;
  completed: number;
  isFuture: boolean;
  isToday: boolean;
}

export interface MonthlyProgress {
  year: number;
  month: number; // 0-indexed (JS Date.getMonth())
  days: DayProgress[];
  totalScheduled: number;
  totalCompleted: number;
  globalRate: number;
}

export class GetMonthlyProgressUseCase {
  constructor(private readonly habitRepo: IHabitRepository) {}

  async execute(userId: UUID, year: number, month: number): Promise<MonthlyProgress> {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const allDays = eachDayOfInterval({ start: firstDay, end: lastDay });

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const from = toISODate(firstDay);
    const to = toISODate(lastDay);

    const [habits, allLogs] = await Promise.all([
      this.habitRepo.findAllByUser(userId),
      this.habitRepo.findAllLogsForUserInRange(userId, from, to),
    ]);

    const logSet = new Set(allLogs.map((l) => `${l.habitId}:${l.completedAt}`));

    let totalScheduled = 0;
    let totalCompleted = 0;

    const days: DayProgress[] = allDays.map((date) => {
      const dateMidnight = new Date(date);
      dateMidnight.setHours(0, 0, 0, 0);

      const isFuture = dateMidnight > todayMidnight;
      const isToday = dateMidnight.getTime() === todayMidnight.getTime();

      const scheduledHabits = habits.filter((h) => isHabitActiveOnDay(h.activeDays, date, h.createdAt));
      const scheduled = scheduledHabits.length;

      if (isFuture) {
        return { date, completionRate: -1, scheduled, completed: 0, isFuture: true, isToday: false };
      }

      const completed = scheduledHabits.filter((h) =>
        logSet.has(`${h.id}:${toISODate(date)}`)
      ).length;

      totalScheduled += scheduled;
      totalCompleted += completed;

      const completionRate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : -1;

      return { date, completionRate, scheduled, completed, isFuture: false, isToday };
    });

    const globalRate =
      totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    return { year, month, days, totalScheduled, totalCompleted, globalRate };
  }
}
