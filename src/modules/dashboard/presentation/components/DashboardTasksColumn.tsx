"use client";

import { useTranslations } from "next-intl";
import { DashboardColumn } from "./DashboardColumn";
import { TaskCardDashboard } from "./TaskCardDashboard";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { Category } from "@/modules/categories/domain/entities/Category";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  category: Category;
  tasks: TaskWithStatus[];
  onToggle: (task: TaskWithStatus) => void;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
  onAdd: () => void;
}

export function DashboardTasksColumn({ userId, category, tasks, onToggle, onEdit, onDelete, onAdd }: Props) {
  const t = useTranslations("dashboard");

  return (
    <DashboardColumn
      title={category.name}
      color={category.color}
      count={tasks.length}
      onAdd={onAdd}
    >
      {tasks.length === 0 ? (
        <div className="rounded-md py-4 text-center text-xs glass-panel" style={{ color: "var(--text-muted)" }}>
          {t("empty_column")}
        </div>
      ) : (
        tasks.map((task) => (
          <TaskCardDashboard
            key={task.id}
            task={task}
            userId={userId}
            onToggle={() => onToggle(task)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        ))
      )}
    </DashboardColumn>
  );
}
