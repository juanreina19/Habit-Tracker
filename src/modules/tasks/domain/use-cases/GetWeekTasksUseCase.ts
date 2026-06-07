import { endOfWeek, eachDayOfInterval } from "date-fns";
import type { ITaskRepository } from "../repositories/ITaskRepository";
import type { Task } from "../entities/Task";
import { isRecurring } from "../entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { today, toISODate, dayOfWeek } from "@/shared/lib/utils/dates";

export interface DayTaskStatus {
  date: Date;
  isScheduled: boolean;
  isCompleted: boolean;
}

export interface WeekTaskEntry {
  task: Task;
  days: DayTaskStatus[];
}

export interface WeekTasksResult {
  weekDays: Date[];
  entries: WeekTaskEntry[];
}

export class GetWeekTasksUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  /**
   * Para cada tarea, deriva el estado de programación/completado de cada día de la
   * semana de forma INDEPENDIENTE — nunca reutiliza `isCompletedToday` (que solo
   * refleja "hoy"). Recurrentes: programadas según `recurrenceDays`, completadas según
   * `task_completions(taskId, fecha)`. Únicas: programadas/completadas en su `dueDate`.
   * Solo incluye tareas con al menos un día programado en la semana visible.
   */
  async execute(userId: UUID, weekStart: Date): Promise<WeekTasksResult> {
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    });
    const weekStartISO = toISODate(weekDays[0]);
    const weekEndISO = toISODate(weekDays[6]);

    const [tasks, completions] = await Promise.all([
      this.repo.findAllByUser(userId, today()),
      this.repo.findCompletionsInRange(userId, weekStartISO, weekEndISO),
    ]);

    const entries: WeekTaskEntry[] = tasks
      .map((task) => {
        const days: DayTaskStatus[] = weekDays.map((date) => {
          const iso = toISODate(date);
          let isScheduled: boolean;
          let isCompleted: boolean;
          if (isRecurring(task)) {
            isScheduled = task.recurrenceDays!.includes(dayOfWeek(date));
            isCompleted = isScheduled && completions.has(`${task.id}:${iso}`);
          } else {
            isScheduled = task.dueDate === iso;
            isCompleted = isScheduled && task.completedAt !== null;
          }
          return { date, isScheduled, isCompleted };
        });
        return { task, days };
      })
      .filter((entry) => entry.days.some((d) => d.isScheduled));

    return { weekDays, entries };
  }
}
