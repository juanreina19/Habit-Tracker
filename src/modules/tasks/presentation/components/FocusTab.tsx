"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { TaskWithStatus } from "../../domain/entities/Task";
import { isTaskDone } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { useFocusSession } from "../hooks/useFocusSession";
import { FocusTaskPicker } from "./FocusTaskPicker";
import { FocusTimer } from "./FocusTimer";

interface Props {
  userId: UUID;
  tasks: TaskWithStatus[];
}

export function FocusTab({ userId, tasks }: Props) {
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
