import { eachDayOfInterval } from "date-fns";
import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { UUID } from "@/shared/types/database.types";
import { toISODate, isHabitActiveOnDay } from "@/shared/lib/utils/dates";
import type { DayProgress } from "./GetMonthlyProgressUseCase";

export class GetYearlyProgressUseCase {
  constructor(private readonly habitRepo: IHabitRepository) {}

  async execute(userId: UUID, year: number): Promise<DayProgress[]> {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    const allDays = eachDayOfInterval({ start: firstDay, end: lastDay });

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const [habits, allLogs] = await Promise.all([
      this.habitRepo.findAllByUser(userId),
      this.habitRepo.findAllLogsForUserInRange(userId, toISODate(firstDay), toISODate(lastDay)),
    ]);

    const logSet = new Set(allLogs.map((l) => `${l.habitId}:${l.completedAt}`));

    return allDays.map((date) => {
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

      const completionRate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : -1;

      return { date, completionRate, scheduled, completed, isFuture: false, isToday };
    });
  }
}
