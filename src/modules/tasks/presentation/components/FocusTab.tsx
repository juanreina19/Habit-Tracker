"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { TaskWithStatus } from "../../domain/entities/Task";
import { isTaskDone } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { useFocusSession } from "../hooks/useFocusSession";
import { FocusTaskPicker } from "./FocusTaskPicker";
import { FocusTimer } from "./FocusTimer";
import { TaskCard } from "./TaskCard";

interface Props {
  userId: UUID;
  tasks: TaskWithStatus[];
  toggleTask: (task: TaskWithStatus) => void;
}

export function FocusTab({ userId, tasks, toggleTask }: Props) {
  const t = useTranslations("focus");
  const focus = useFocusSession(userId);
  const active = focus.active;
  const task = active ? tasks.find((task) => task.id === active.taskId) : undefined;
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (active && !task) focus.discard();
  }, [active, task, focus.discard]);

  if (active) {
    if (!task) {
      return (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>
          {t("task_deleted_notice", { title: active.taskTitle })}
        </p>
      );
    }

    const handleFinish = async () => {
      const { recorded } = await focus.finish();
      if (!recorded) setNotice(t("session_too_short"));
    };

    const handleRestart = async () => {
      await focus.finish();
      const latestTask = tasks.find((t) => t.id === task.id);
      if (!latestTask || latestTask.focusDurationMin === null || isTaskDone(latestTask)) return;
      focus.start(latestTask);
    };

    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="lg:flex-1">
          <FocusTimer
            session={active}
            taskTitle={task.title}
            onPause={focus.pause}
            onResume={focus.resume}
            onContinueWorking={focus.continueWorking}
            onFinish={handleFinish}
            onRestart={handleRestart}
            isFinishing={focus.isFinishing}
          />
        </div>
        <div className="lg:w-80 lg:flex-shrink-0">
          <TaskCard task={task} onToggle={() => toggleTask(task)} />
        </div>
      </div>
    );
  }

  const eligible = tasks.filter((t) => !isTaskDone(t) && t.focusDurationMin !== null);
  const hasPendingTasks = tasks.some((t) => !isTaskDone(t));

  return (
    <div className="flex flex-col gap-3">
      {notice && (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>
          {notice}
        </p>
      )}
      <FocusTaskPicker
        tasks={eligible}
        hasPendingTasks={hasPendingTasks}
        onSelect={(task) => {
          setNotice(null);
          focus.start(task);
        }}
      />
    </div>
  );
}
