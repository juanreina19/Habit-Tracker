import type { IHabitRepository } from "../repositories/IHabitRepository";
import type { UUID, ISODate } from "@/shared/types/database.types";
import type { Streak } from "../entities/Habit";
import { toISODate, dayOfWeek } from "@/shared/lib/utils/dates";
import { subDays, parseISO } from "date-fns";

/**
 * Calcula y persiste la racha de un hábito.
 * La racha solo cuenta en los días que el hábito está configurado como activo.
 * El "día de gracia" (freeze) permite saltar 1 día por semana sin romper la racha.
 */
export class CalculateStreakUseCase {
  constructor(private readonly habitRepository: IHabitRepository) {}

  async execute(habitId: UUID, userId: UUID): Promise<Streak> {
    const [habit, logs, existingStreak] = await Promise.all([
      this.habitRepository.findById(habitId),
      this.habitRepository.findLogs(habitId),
      this.habitRepository.findStreak(habitId),
    ]);

    if (!habit) throw new Error(`Habit ${habitId} not found`);

    const logDates = new Set(logs.map((l) => l.completedAt));
    const today = new Date();
    let current = 0;
    let date = today;
    let freezeUsedAt: ISODate | null = null;
    let freezeAvailableThisWeek = true;

    // Si ya se usó el freeze esta semana, no está disponible
    if (existingStreak?.freezeUsedAt) {
      const freezeDate = parseISO(existingStreak.freezeUsedAt);
      const startOfCurrentWeek = new Date(today);
      startOfCurrentWeek.setDate(today.getDate() - today.getDay() + 1);
      freezeAvailableThisWeek = freezeDate < startOfCurrentWeek;
    }

    // Cuenta hacia atrás desde hoy
    for (let i = 0; i < 365; i++) {
      const isoDate = toISODate(date);
      const dow = dayOfWeek(date);
      const isActiveDay = habit.activeDays.includes(dow);

      if (!isActiveDay) {
        // Día no activo: no rompe la racha
        date = new Date(subDays(date, 1));
        continue;
      }

      if (logDates.has(isoDate)) {
        current++;
        date = new Date(subDays(date, 1));
        continue;
      }

      // Día activo sin completar — verificar freeze
      if (i > 0 && freezeAvailableThisWeek && !freezeUsedAt) {
        // Usar el día de gracia: continuar la racha
        freezeUsedAt = isoDate;
        date = new Date(subDays(date, 1));
        continue;
      }

      // Racha rota
      break;
    }

    const newStreak: Partial<Omit<Streak, "id" | "habitId" | "userId">> = {
      currentStreak: current,
      bestStreak: Math.max(current, existingStreak?.bestStreak ?? 0),
      lastCompletedAt: logs.length > 0
        ? Array.from(logDates).sort().reverse()[0] as ISODate
        : null,
      freezeUsedAt: freezeUsedAt ?? existingStreak?.freezeUsedAt ?? null,
    };

    return this.habitRepository.updateStreak(habitId, userId, newStreak);
  }
}
