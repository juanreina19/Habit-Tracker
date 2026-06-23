"use client";

import { useTranslations } from "next-intl";
import { DashboardColumn } from "./DashboardColumn";
import { TaskCardDashboard } from "./TaskCardDashboard";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";

interface Props {
  tasks: TaskWithStatus[];
  onToggle: (task: TaskWithStatus) => void;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
}

export function DashboardOverdueColumn({ tasks, onToggle, onEdit, onDelete }: Props) {
  const t = useTranslations("dashboard");

  if (tasks.length === 0) return null;

  return (
    <DashboardColumn title={t("overdue")} count={tasks.length} color="#ef4444">
      {tasks.map((task) => (
        <TaskCardDashboard
          key={task.id}
          task={task}
          overdue
          onToggle={() => onToggle(task)}
          onEdit={() => onEdit(task)}
          onDelete={() => onDelete(task)}
        />
      ))}
    </DashboardColumn>
  );
}
