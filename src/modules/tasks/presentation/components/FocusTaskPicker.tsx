"use client";

import { useTranslations } from "next-intl";
import type { TaskWithStatus } from "../../domain/entities/Task";
import { PRIORITY_COLORS } from "../constants/taskColors";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { TaskEmptyState } from "./TaskEmptyState";

interface Props {
  tasks: TaskWithStatus[];
  hasPendingTasks: boolean;
  onSelect: (task: TaskWithStatus) => void;
}

export function FocusTaskPicker({ tasks, hasPendingTasks, onSelect }: Props) {
  const t = useTranslations("focus");

  if (tasks.length === 0) {
    if (!hasPendingTasks) return <TaskEmptyState />;
    return (
      <div className="rounded-[20px] p-8 text-center" style={{ background: "var(--surface)" }}>
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
          {t("picker_empty_no_focus_tasks")}
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {t("picker_empty_hint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
        {t("picker_title")}
      </p>
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onSelect(task)}
          className="flex items-center gap-3 rounded-[16px] p-4 text-left transition-opacity active:opacity-70"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: PRIORITY_COLORS[task.priority] }}
          />
          {task.icon && (
            <span className="flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
              <HabitIcon icon={task.icon} size={18} />
            </span>
          )}
          <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {task.title}
          </span>
          <span className="flex-shrink-0 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {task.focusDurationMin ?? 0} {t("duration_unit")}
          </span>
        </button>
      ))}
    </div>
  );
}
