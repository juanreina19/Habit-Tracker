"use client";

import { useTranslations } from "next-intl";
import { DashboardOverdueColumn } from "./DashboardOverdueColumn";
import { DashboardHabitsColumn } from "./DashboardHabitsColumn";
import { DashboardTasksColumn } from "./DashboardTasksColumn";
import { DashboardColumn } from "./DashboardColumn";
import { TaskCardDashboard } from "./TaskCardDashboard";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";
import type { Category } from "@/modules/categories/domain/entities/Category";

interface Props {
  categories: Category[];
  tasksByCategory: Record<string, TaskWithStatus[]>;
  uncategorized: TaskWithStatus[];
  overdue: TaskWithStatus[];
  habits: HabitWithStatus[];
  onToggleTask: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
  onAddTask: (categoryId?: string | null) => void;
  onCompleteHabit: (habitId: string) => void;
  onUncheckHabit: (habitId: string) => void;
}

export function TableroTab({
  categories, tasksByCategory, uncategorized, overdue, habits,
  onToggleTask, onEditTask, onDeleteTask, onAddTask,
  onCompleteHabit, onUncheckHabit,
}: Props) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-4 lg:overflow-x-auto lg:pb-4 lg:-mx-2 lg:px-2">
      <DashboardOverdueColumn
        tasks={overdue}
        onToggle={onToggleTask}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
      />

      <DashboardHabitsColumn
        habits={habits}
        onComplete={onCompleteHabit}
        onUncheck={onUncheckHabit}
      />

      {categories.map((cat) => (
        <DashboardTasksColumn
          key={cat.id}
          category={cat}
          tasks={tasksByCategory[cat.id] ?? []}
          onToggle={onToggleTask}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onAdd={() => onAddTask(cat.id)}
        />
      ))}

      {uncategorized.length > 0 && (
        <DashboardColumn
          title={t("uncategorized")}
          count={uncategorized.length}
          collapsible
          defaultCollapsed
          onAdd={() => onAddTask()}
        >
          {uncategorized.map((task) => (
            <TaskCardDashboard
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task)}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task)}
            />
          ))}
        </DashboardColumn>
      )}
    </div>
  );
}
