"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { InlineTaskInput } from "./InlineTaskInput";
import { TaskCardDashboard } from "./TaskCardDashboard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { isTaskDone } from "@/modules/tasks/domain/entities/Task";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

interface Props {
  todayTasks: TaskWithStatus[];
  habits: HabitWithStatus[];
  overdue: TaskWithStatus[];
  onToggleTask: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
  onCreateTask: (title: string) => void;
  onCompleteHabit: (habitId: string) => void;
  onUncheckHabit: (habitId: string) => void;
}

interface AgendaItem {
  type: "task" | "habit";
  id: string;
  label: string;
  time: string | null;
  color: string;
  completed: boolean;
  task?: TaskWithStatus;
  habit?: HabitWithStatus;
}

export function EnfoqueTab({
  todayTasks, habits, overdue,
  onToggleTask, onEditTask, onDeleteTask, onCreateTask,
  onCompleteHabit, onUncheckHabit,
}: Props) {
  const t = useTranslations("dashboard");

  const pendingTasks = useMemo(
    () => todayTasks.filter((tk) => !isTaskDone(tk) && !(tk.dueDate && tk.dueDate < new Date().toISOString().slice(0, 10))),
    [todayTasks],
  );

  const agendaItems = useMemo<AgendaItem[]>(() => {
    const items: AgendaItem[] = [];

    for (const task of pendingTasks) {
      items.push({
        type: "task",
        id: task.id,
        label: task.title,
        time: task.startTime?.slice(0, 5) ?? null,
        color: "var(--accent)",
        completed: isTaskDone(task),
        task,
      });
    }

    for (const habit of habits) {
      items.push({
        type: "habit",
        id: habit.id,
        label: habit.name,
        time: habit.startTime ?? null,
        color: habit.color ?? "#4CAF82",
        completed: habit.isCompletedToday,
        habit,
      });
    }

    return items.sort((a, b) => {
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    });
  }, [pendingTasks, habits]);

  const urgencyTasks = useMemo(
    () => [...pendingTasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)),
    [pendingTasks],
  );

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-4">
      {/* Agenda */}
      <div className="flex flex-col gap-3">
        <SectionHeader label="AGENDA" />
        <InlineTaskInput onCreateTask={onCreateTask} />
        <div className="flex flex-col gap-2">
          {agendaItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className="flex items-start gap-2"
            >
              {/* Time gutter */}
              <span
                className="w-10 flex-shrink-0 text-[10px] tabular-nums font-medium pt-2.5 text-right"
                style={{ color: "var(--text-muted)" }}
              >
                {item.time ?? ""}
              </span>

              <div className="flex-1 min-w-0">
                {item.type === "task" && item.task && (
                  <TaskCardDashboard
                    task={item.task}
                    onToggle={() => onToggleTask(item.task!)}
                    onEdit={() => onEditTask(item.task!)}
                    onDelete={() => onDeleteTask(item.task!)}
                  />
                )}
                {item.type === "habit" && item.habit && (
                  <HabitAgendaRow
                    habit={item.habit}
                    onToggle={() => {
                      if (item.habit!.isCompletedToday) onUncheckHabit(item.habit!.id);
                      else onCompleteHabit(item.habit!.id);
                    }}
                  />
                )}
              </div>
            </motion.div>
          ))}
          {agendaItems.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
              —
            </p>
          )}
        </div>
      </div>

      {/* Urgency */}
      <div className="flex flex-col gap-3">
        <SectionHeader label="URGENCIA" />
        <div className="flex flex-col gap-2">
          {urgencyTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <TaskCardDashboard
                task={task}
                onToggle={() => onToggleTask(task)}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task)}
              />
            </motion.div>
          ))}
          {urgencyTasks.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
              —
            </p>
          )}
        </div>
      </div>

      {/* Overdue / Vencidas */}
      <div className="flex flex-col gap-3">
        <SectionHeader label={t("overdue").toUpperCase()} />
        <div className="flex flex-col gap-2">
          {overdue.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <TaskCardDashboard
                task={task}
                onToggle={() => onToggleTask(task)}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task)}
              />
            </motion.div>
          ))}
          {overdue.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
              —
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


function HabitAgendaRow({ habit, onToggle }: { habit: HabitWithStatus; onToggle: () => void }) {
  const done = habit.isCompletedToday;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left rounded-lg p-3 flex items-center gap-3 transition-all active:scale-[0.98]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: done ? "#FFFFFF" : "transparent",
          border: done ? "2px solid #FFFFFF" : "2px solid var(--border)",
        }}
      >
        {done && (
          <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3.5 3.5L11 1" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{
            color: done ? "var(--text-secondary)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {habit.name}
        </p>
      </div>
      {habit.startTime && (
        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
          {habit.startTime}
        </span>
      )}
    </button>
  );
}
