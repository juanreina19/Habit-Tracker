"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DashboardColumn } from "./DashboardColumn";
import { TaskCardDashboard } from "./TaskCardDashboard";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { Category } from "@/modules/categories/domain/entities/Category";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  tasks: TaskWithStatus[];
  categories: Category[];
  onToggle: (task: TaskWithStatus) => void;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
  onAdd: () => void;
}

/**
 * Tabla única de tareas de Board — consolida lo que antes eran N columnas
 * (una por categoría + "sin categoría"), con la categoría como chip por
 * fila en vez de como agrupador. Misma fuente que las columnas de Focus/
 * Kanban (dashboard.allPendingTasks), sin recomponerla acá.
 */
export function DashboardTasksTable({ userId, tasks, categories, onToggle, onEdit, onDelete, onAdd }: Props) {
  const t = useTranslations("dashboard");
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <DashboardColumn title={t("all_tasks")} count={tasks.length} onAdd={onAdd}>
      {tasks.length === 0 ? (
        <div className="rounded-md py-4 text-center text-xs glass-panel" style={{ color: "var(--text-muted)" }}>
          {t("empty_column")}
        </div>
      ) : (
        tasks.map((task) => {
          const cat = task.categoryId ? categoryById.get(task.categoryId) : undefined;
          return (
            <TaskCardDashboard
              key={task.id}
              task={task}
              userId={userId}
              categoryColor={cat?.color}
              categoryLabel={cat?.name}
              onToggle={() => onToggle(task)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
            />
          );
        })
      )}
    </DashboardColumn>
  );
}
