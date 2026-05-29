import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { UUID, ISODate } from "@/shared/types/database.types";
import type { HabitLog } from "../entities/Habit";
import { CalculateStreakUseCase } from "./CalculateStreakUseCase";

export class CompleteHabitUseCase {
  constructor(
    private readonly habitRepository: IHabitRepository,
    private readonly calculateStreakUseCase: CalculateStreakUseCase
  ) {}

  async execute(
    habitId: UUID,
    userId: UUID,
    date: ISODate
  ): Promise<{ log: HabitLog; currentStreak: number; bestStreak: number }> {
    const log = await this.habitRepository.logCompletion(habitId, userId, date);
    const streak = await this.calculateStreakUseCase.execute(habitId, userId);

    return {
      log,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
    };
  }
}
