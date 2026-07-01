import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { UUID } from "@/shared/types/database.types";
import type { HabitWithStatus } from "../entities/Habit";
import { today } from "@/shared/lib/utils/dates";

export class GetTodayHabitsUseCase {
  constructor(private readonly habitRepository: IHabitRepository) {}

  async execute(userId: UUID, date?: string): Promise<{
    habits: HabitWithStatus[];
    completedCount: number;
    totalCount: number;
    completionPercentage: number;
    estimatedMinutes: number;
  }> {
    const habits = await this.habitRepository.findActiveForDate(userId, date ?? today());

    const completedCount = habits.filter((h) => h.isCompletedToday).length;
    const totalCount = habits.length;
    const completionPercentage = totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;
    const estimatedMinutes = habits
      .filter((h) => !h.isCompletedToday)
      .reduce((acc, h) => acc + (h.estimatedMinutes ?? 0), 0);

    return {
      habits,
      completedCount,
      totalCount,
      completionPercentage,
      estimatedMinutes,
    };
  }
}
