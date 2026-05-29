import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { UUID, ISODate } from "@/shared/types/database.types";
import { CalculateStreakUseCase } from "./CalculateStreakUseCase";

export class UncompleteHabitUseCase {
  constructor(
    private readonly habitRepository: IHabitRepository,
    private readonly calculateStreakUseCase: CalculateStreakUseCase
  ) {}

  async execute(habitId: UUID, userId: UUID, date: ISODate): Promise<void> {
    await this.habitRepository.removeLog(habitId, userId, date);
    await this.calculateStreakUseCase.execute(habitId, userId);
  }
}
