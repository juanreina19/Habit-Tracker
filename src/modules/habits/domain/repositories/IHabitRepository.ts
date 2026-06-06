import type { UUID, ISODate } from "@/shared/types/database.types";
import type { Habit, HabitLog, HabitWithStatus, Streak } from "../entities/Habit";

export interface CreateHabitInput {
  categoryId: UUID | null;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  activeDays: number[];
  estimatedMinutes?: number;
  startTime?: string | null;
}

export interface UpdateHabitInput {
  categoryId?: UUID | null;
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  activeDays?: number[];
  estimatedMinutes?: number | null;
  startTime?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface IHabitRepository {
  /** Obtiene todos los hábitos activos del usuario */
  findAllByUser(userId: UUID): Promise<Habit[]>;

  /** Obtiene hábitos activos para un día específico, con estado de completado */
  findActiveForDate(userId: UUID, date: ISODate): Promise<HabitWithStatus[]>;

  /** Obtiene un hábito por ID */
  findById(id: UUID): Promise<Habit | null>;

  /** Crea un nuevo hábito */
  create(userId: UUID, input: CreateHabitInput): Promise<Habit>;

  /** Actualiza un hábito existente */
  update(id: UUID, input: UpdateHabitInput): Promise<Habit>;

  /** Elimina el hábito permanentemente (hard delete — habit_logs y streaks se eliminan por CASCADE) */
  deactivate(id: UUID): Promise<void>;

  /** Reordena hábitos según array de IDs ordenado */
  reorder(habitIds: UUID[]): Promise<void>;

  // ─── Logs ───────────────────────────────────────────────────────────────

  /** Marca un hábito como completado en una fecha */
  logCompletion(habitId: UUID, userId: UUID, date: ISODate): Promise<HabitLog>;

  /** Desmarca un hábito como completado en una fecha */
  removeLog(habitId: UUID, userId: UUID, date: ISODate): Promise<void>;

  /** Obtiene todos los logs de un hábito */
  findLogs(habitId: UUID, from?: ISODate, to?: ISODate): Promise<HabitLog[]>;

  /** Obtiene todos los logs de un usuario en un rango de fechas */
  findAllLogsForUserInRange(userId: UUID, from: ISODate, to: ISODate): Promise<HabitLog[]>;

  // ─── Streaks ─────────────────────────────────────────────────────────────

  /** Obtiene la racha de un hábito */
  findStreak(habitId: UUID): Promise<Streak | null>;

  /** Obtiene todas las rachas de un usuario */
  findAllStreaksForUser(userId: UUID): Promise<Streak[]>;

  /** Actualiza la racha de un hábito */
  updateStreak(habitId: UUID, userId: UUID, streak: Partial<Omit<Streak, "id" | "habitId" | "userId">>): Promise<Streak>;
}
