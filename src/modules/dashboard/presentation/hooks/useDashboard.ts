"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useTasks } from "@/modules/tasks/presentation/hooks/useTasks";
import { useTodayTasks } from "@/modules/tasks/presentation/hooks/useTodayTasks";
import { useHabits } from "@/modules/habits/presentation/hooks/useHabits";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { useFocusMode } from "@/modules/tasks/presentation/hooks/useFocusMode";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import type { TaskWithStatus, TaskStatus } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

export function useDashboard(userId: UUID) {
  const { tasks, isLoading: tasksLoading, toggleTask, createTask, updateTask, deleteTask } = useTasks(userId);
  const { tasks: todayTasks, toggleTask: toggleTodayTask } = useTodayTasks(userId);
  const { habits, completedCount, totalCount, completeHabit, uncheckHabit } = useHabits(userId);
  const { categories, isLoading: categoriesLoading } = useCategories(userId);
  const focusMode = useFocusMode(userId);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const derived = useMemo(() => {
    const pending = tasks.filter(t => !isTaskDone(t));
    const overdue = tasks.filter(t => t.dueDate !== null && t.dueDate < todayStr);
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
    focusMode,
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
