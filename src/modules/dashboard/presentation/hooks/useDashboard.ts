"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { useTasks } from "@/modules/tasks/presentation/hooks/useTasks";
import { useTodayTasks } from "@/modules/tasks/presentation/hooks/useTodayTasks";
import { useHabits } from "@/modules/habits/presentation/hooks/useHabits";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import { isTaskOverdue } from "@/modules/tasks/domain/entities/taskFilters";
import { useMidnightRefresh } from "@/shared/hooks/useMidnightRefresh";
import { useMinuteTick } from "@/shared/hooks/useMinuteTick";
import type { TaskWithStatus, TaskStatus } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

export function useDashboard(userId: UUID, viewDate?: Date) {
  const [, forceTick] = useState(0);
  const onMidnight = useCallback(() => forceTick(n => n + 1), []);
  useMidnightRefresh(onMidnight);
  useMinuteTick(onMidnight);

  const dateStr = viewDate ? format(viewDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  const { tasks, isLoading: tasksLoading, toggleTask, createTask, updateTask, deleteTask } = useTasks(userId);
  const { tasks: todayTasks, toggleTask: toggleTodayTask, refetch: refetchTodayTasks } = useTodayTasks(userId, dateStr);
  const { habits, completedCount, totalCount, completeHabit, uncheckHabit } = useHabits(userId, dateStr);
  const { categories, isLoading: categoriesLoading } = useCategories(userId);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const derived = useMemo(() => {
    const pending = tasks.filter(t => !isTaskDone(t));
    const overdue = tasks.filter(t => isTaskOverdue(t, todayStr));
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

    // "De hoy" excluye las atrasadas que useTodayTasks mezcla junto con las de hoy.
    const todayCount = todayTasks.filter(t => !overdueIds.has(t.id)).length;

    return { overdue, tasksByCategory, uncategorized, todayCount };
  }, [tasks, categories, todayStr, todayTasks]);

  const updateTaskStatus = (taskId: UUID, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) updateTask(task, { status });
  };

  const wrappedCreateTask = useCallback(async (...args: Parameters<typeof createTask>) => {
    await createTask(...args);
    await refetchTodayTasks();
  }, [createTask, refetchTodayTasks]);

  const wrappedUpdateTask = useCallback(async (...args: Parameters<typeof updateTask>) => {
    await updateTask(...args);
    await refetchTodayTasks();
  }, [updateTask, refetchTodayTasks]);

  const wrappedDeleteTask = useCallback(async (...args: Parameters<typeof deleteTask>) => {
    await deleteTask(...args);
    await refetchTodayTasks();
  }, [deleteTask, refetchTodayTasks]);

  return {
    ...derived,
    categories,
    habits,
    todayTasks,
    tasks,
    isLoading: tasksLoading || categoriesLoading,
    habitsProgress: { completed: completedCount, total: totalCount },
    isToday: dateStr === format(new Date(), "yyyy-MM-dd"),
    toggleTask,
    toggleTodayTask,
    completeHabit,
    uncheckHabit,
    createTask: wrappedCreateTask,
    updateTask: wrappedUpdateTask,
    deleteTask: wrappedDeleteTask,
    updateTaskStatus,
  };
}
