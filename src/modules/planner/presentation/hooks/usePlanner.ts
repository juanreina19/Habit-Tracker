"use client";

import { useState, useMemo, useCallback } from "react";
import { format, addDays } from "date-fns";
import { useTasks } from "@/modules/tasks/presentation/hooks/useTasks";
import { useHabits } from "@/modules/habits/presentation/hooks/useHabits";
import { dayOfWeek } from "@/shared/lib/utils/dates";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";
import type { UUID } from "@/shared/types/database.types";

export interface ScheduledBlock {
  id: string;
  label: string;
  startMin: number;
  endMin: number;
  color: string;
  type: "task" | "habit";
}

export function usePlanner(userId: UUID) {
  const [date, setDate] = useState(() => new Date());
  const { tasks, isLoading: tasksLoading, updateTask, createTask } = useTasks(userId);
  const { habits } = useHabits(userId);

  const dateStr = format(date, "yyyy-MM-dd");
  const dow = dayOfWeek(date);

  const pendingTasks = useMemo(
    () => tasks.filter((t) => !isTaskDone(t) && !t.startTime && (!t.dueDate || t.dueDate >= dateStr)),
    [tasks, dateStr],
  );

  const scheduledBlocks = useMemo(() => {
    const blocks: ScheduledBlock[] = [];

    for (const task of tasks) {
      if (!task.startTime) continue;
      if (task.dueDate && task.dueDate !== dateStr) continue;
      const start = parseTime(task.startTime);
      const end = task.endTime ? parseTime(task.endTime) : start + 30;
      blocks.push({
        id: `task-${task.id}`,
        label: task.title,
        startMin: start,
        endMin: end,
        color: "var(--accent)",
        type: "task",
      });
    }

    for (const habit of habits) {
      if (!habit.startTime || !habit.activeDays.includes(dow)) continue;
      const start = parseTime(habit.startTime);
      const end = start + (habit.estimatedMinutes ?? 30);
      blocks.push({
        id: `habit-${habit.id}`,
        label: habit.name,
        startMin: start,
        endMin: end,
        color: habit.color ?? "#4CAF82",
        type: "habit",
      });
    }

    return blocks.sort((a, b) => a.startMin - b.startMin);
  }, [tasks, habits, dateStr, dow]);

  const scheduleTask = useCallback(
    (taskId: UUID, startTime: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) updateTask(task, { startTime, dueDate: dateStr });
    },
    [tasks, updateTask, dateStr],
  );

  const unscheduleTask = useCallback(
    (taskId: UUID) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) updateTask(task, { startTime: null, endTime: null });
    },
    [tasks, updateTask],
  );

  return {
    date,
    setDate,
    prevDay: () => setDate((d) => addDays(d, -1)),
    nextDay: () => setDate((d) => addDays(d, 1)),
    goToToday: () => setDate(new Date()),
    pendingTasks,
    scheduledBlocks,
    scheduleTask,
    unscheduleTask,
    createTask,
    isLoading: tasksLoading,
  };
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
