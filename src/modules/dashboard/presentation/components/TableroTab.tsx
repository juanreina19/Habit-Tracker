"use client";

import { DashboardHabitsColumn } from "./DashboardHabitsColumn";
import { DashboardTasksTable } from "./DashboardTasksTable";
import { DashboardWorkoutsColumn } from "./DashboardWorkoutsColumn";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";
import type { Category } from "@/modules/categories/domain/entities/Category";
import type { WorkoutWithStatus } from "@/modules/workouts/domain/entities/Workout";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  categories: Category[];
  allPendingTasks: TaskWithStatus[];
  habits: HabitWithStatus[];
  workouts: WorkoutWithStatus[];
  onToggleTask: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
  onAddTask: (categoryId?: string | null) => void;
  onCompleteHabit: (habitId: string) => void;
  onUncheckHabit: (habitId: string) => void;
  onToggleWorkout: (workout: WorkoutWithStatus) => void;
}

export function TableroTab({
  userId, categories, allPendingTasks, habits, workouts,
  onToggleTask, onEditTask, onDeleteTask, onAddTask,
  onCompleteHabit, onUncheckHabit, onToggleWorkout,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <DashboardHabitsColumn
        habits={habits}
        onComplete={onCompleteHabit}
        onUncheck={onUncheckHabit}
      />

      <DashboardTasksTable
        userId={userId}
        tasks={allPendingTasks}
        categories={categories}
        onToggle={onToggleTask}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onAdd={() => onAddTask()}
      />

      {workouts.length > 0 && (
        <DashboardWorkoutsColumn workouts={workouts} onToggle={onToggleWorkout} />
      )}
    </div>
  );
}
