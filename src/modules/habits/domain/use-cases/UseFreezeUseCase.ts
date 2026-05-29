import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { UUID } from "@/shared/types/database.types";
import { today } from "@/shared/lib/utils/dates";
import { parseISO, startOfWeek } from "date-fns";

/**
 * Usa el día de gracia (freeze) para un hábito.
 * Solo disponible 1 vez por semana.
 */
export class UseFreezeUseCase {
  constructor(private readonly habitRepository: IHabitRepository) {}

  async execute(habitId: UUID, userId: UUID): Promise<void> {
    const streak = await this.habitRepository.findStreak(habitId);
    const todayStr = today();
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    if (streak?.freezeUsedAt) {
      const freezeDate = parseISO(streak.freezeUsedAt);
      if (freezeDate >= weekStart) {
        throw new Error("Ya usaste el día de gracia esta semana");
      }
    }

    await this.habitRepository.updateStreak(habitId, userId, {
      freezeUsedAt: todayStr,
    });
  }
}
