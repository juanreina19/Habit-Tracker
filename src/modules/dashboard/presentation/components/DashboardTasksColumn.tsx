"use client";

import { useTranslations } from "next-intl";
import { DashboardColumn } from "./DashboardColumn";
import { TaskCardDashboard } from "./TaskCardDashboard";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { Category } from "@/modules/categories/domain/entities/Category";

interface Props {
  category: Category;
  tasks: TaskWithStatus[];
  onToggle: (task: TaskWithStatus) => void;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
  onAdd: () => void;
}

export function DashboardTasksColumn({ category, tasks, onToggle, onEdit, onDelete, onAdd }: Props) {
  const t = useTranslations("dashboard");

  return (
    <DashboardColumn
      title={category.name}
      color={category.color}
      count={tasks.length}
      onAdd={onAdd}
    >
      {tasks.length === 0 ? (
        <div className="rounded-[12px] py-4 text-center text-xs" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
          {t("empty_column")}
        </div>
      ) : (
        tasks.map((task) => (
          <TaskCardDashboard
            key={task.id}
            task={task}
            onToggle={() => onToggle(task)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        ))
      )}
    </DashboardColumn>
  );
}
