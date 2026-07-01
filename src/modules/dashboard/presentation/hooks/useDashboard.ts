"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { useTasks } from "@/modules/tasks/presentation/hooks/useTasks";
import { useTodayTasks } from "@/modules/tasks/presentation/hooks/useTodayTasks";
import { useHabits } from "@/modules/habits/presentation/hooks/useHabits";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import { useMidnightRefresh } from "@/shared/hooks/useMidnightRefresh";
import { useMinuteTick } from "@/shared/hooks/useMinuteTick";
import type { TaskWithStatus, TaskStatus } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

export function useDashboard(userId: UUID) {
  const [, forceTick] = useState(0);
  const onMidnight = useCallback(() => forceTick(n => n + 1), []);
  useMidnightRefresh(onMidnight);
  useMinuteTick(onMidnight);

  const { tasks, isLoading: tasksLoading, toggleTask, createTask, updateTask, deleteTask } = useTasks(userId);
  const { tasks: todayTasks, toggleTask: toggleTodayTask } = useTodayTasks(userId);
  const { habits, completedCount, totalCount, completeHabit, uncheckHabit } = useHabits(userId);
  const { categories, isLoading: categoriesLoading } = useCategories(userId);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const derived = useMemo(() => {
    const pending = tasks.filter(t => !isTaskDone(t));
    const overdue = tasks.filter(t => {
      if (t.dueDate === null || t.dueDate >= todayStr) return false;
      if (!isTaskDone(t)) return true;
      // Completadas: solo mostrar si se completaron HOY (usa timezone local, no UTC string)
      const completedToday = t.recurrenceDays
        ? t.isCompletedToday
        : (t.completedAt ? format(new Date(t.completedAt), "yyyy-MM-dd") === todayStr : false);
      return completedToday;
    });
    const overdueIds = new Set(overdue.map(t => t.id));

    const tasksByCategory: Record<string, TaskWithStatus[]> = {};
    for (const cat of categories) {
      tasksByCategory[cat.id] = pending.filter(
        t => t.categoryId === cat.id && !overdueIds.has(t.id)
      );
    }

    const uncategorized = pending.filter(
      t => !t.categoryId && !overdueIds.has(t.id)
    );

    return { overdue, tasksByCategory, uncategorized };
  }, [tasks, categories, todayStr]);

  const updateTaskStatus = (taskId: UUID, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) updateTask(task, { status });
  };

  return {
    ...derived,
    categories,
    habits,
    todayTasks,
    tasks,
    isLoading: tasksLoading || categoriesLoading,
    habitsProgress: { completed: completedCount, total: totalCount },
    toggleTask,
    toggleTodayTask,
    completeHabit,
    uncheckHabit,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  };
}
