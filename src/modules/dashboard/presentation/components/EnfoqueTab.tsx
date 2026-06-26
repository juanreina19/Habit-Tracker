"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ListTodo, Sparkles, Filter } from "lucide-react";
import { InlineTaskInput } from "./InlineTaskInput";
import { TaskCardDashboard } from "./TaskCardDashboard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { isTaskDone, formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { today as getToday } from "@/shared/lib/utils/dates";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";

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
  time: string | null;
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
  const [urgencyFilter, setUrgencyFilter] = useState(false);

  const todayNonOverdue = useMemo(
    () => todayTasks.filter((tk) => !(tk.dueDate && tk.dueDate < getToday())),
    [todayTasks],
  );

  const agendaItems = useMemo<AgendaItem[]>(() => {
    const items: AgendaItem[] = [];

    for (const task of todayNonOverdue) {
      if (urgencyFilter && task.priority !== "urgent" && task.priority !== "high") continue;
      items.push({
        type: "task",
        id: task.id,
        time: task.startTime ? formatTaskTime(task.startTime) : null,
        completed: isTaskDone(task),
        task,
      });
    }

    for (const habit of habits) {
      items.push({
        type: "habit",
        id: habit.id,
        time: habit.startTime ? formatTaskTime(habit.startTime) : null,
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
  }, [todayNonOverdue, habits, urgencyFilter]);

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
      {/* Agenda with timeline */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionHeader label="AGENDA" />
          <button
            type="button"
            onClick={() => setUrgencyFilter(p => !p)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
            style={{
              background: urgencyFilter ? "var(--danger)" : "var(--surface-elevated)",
              color: urgencyFilter ? "#fff" : "var(--text-muted)",
            }}
          >
            <Filter size={10} strokeWidth={1.5} />
            {t("filter_urgent")}
          </button>
        </div>
        <InlineTaskInput onCreateTask={onCreateTask} />

        {/* Timeline */}
        <div className="flex flex-col">
          {agendaItems.map((item, idx) => {
            const timeParts = item.time?.split(" ") ?? [];
            return (
              <div key={item.id} className="flex items-stretch">
                {/* Time label */}
                <div className="w-14 flex-shrink-0 text-right pr-3 pt-2.5">
                  {timeParts[0] && (
                    <>
                      <span className="text-[10px] tabular-nums font-normal leading-none block" style={{ color: "var(--text-muted)" }}>
                        {timeParts[0]}
                      </span>
                      {timeParts[1] && (
                        <span className="text-[8px] font-normal leading-none block mt-px" style={{ color: "var(--text-muted)" }}>
                          {timeParts[1]}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Line + icon node */}
                <div className="w-6 flex-shrink-0 flex flex-col items-center relative">
                  {/* Vertical line */}
                  {idx > 0 && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 w-px" style={{ background: "var(--border)" }} />}
                  {/* Node */}
                  <div
                    className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-2.5"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    {item.type === "habit"
                      ? <Sparkles size={10} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                      : <ListTodo size={10} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                    }
                  </div>
                  {/* Line below node */}
                  {idx < agendaItems.length - 1 && (
                    <div className="flex-1 w-px mt-0.5" style={{ background: "var(--border)" }} />
                  )}
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0 pb-2 pl-2">
                  {item.type === "task" && item.task && (
                    <TaskCardDashboard
                      task={item.task}
                      onToggle={() => onToggleTask(item.task!)}
                      onEdit={() => onEditTask(item.task!)}
                      onDelete={() => onDeleteTask(item.task!)}
                      showDescription
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
              </div>
            );
          })}
          {agendaItems.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>—</p>
          )}
        </div>
      </div>

      {/* Overdue / Vencidas — timeline without time, just line + icons */}
      <div className="flex flex-col gap-3">
        <SectionHeader label={t("overdue").toUpperCase()} />
        <div className="flex flex-col">
          {overdue.map((task, idx) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="flex items-stretch"
            >
              {/* Line + icon (no time) */}
              <div className="w-6 flex-shrink-0 flex flex-col items-center relative">
                {idx > 0 && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 w-px" style={{ background: "var(--border)" }} />}
                <div
                  className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-2.5"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <ListTodo size={10} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                </div>
                {idx < overdue.length - 1 && (
                  <div className="flex-1 w-px mt-0.5" style={{ background: "var(--border)" }} />
                )}
              </div>

              {/* Card */}
              <div className="flex-1 min-w-0 pb-2 pl-2">
                <TaskCardDashboard
                  task={task}
                  onToggle={() => onToggleTask(task)}
                  onEdit={() => onEditTask(task)}
                  onDelete={() => onDeleteTask(task)}
                  overdue
                  showDescription
                  showDueDate
                />
              </div>
            </motion.div>
          ))}
          {overdue.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>—</p>
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
      className="w-full text-left rounded-md p-2.5 flex items-center gap-3 transition-colors active:scale-[0.98]"
      style={{
        background: "var(--bg)",
        border: done ? "1px solid transparent" : "1px solid var(--border)",
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
          className="text-sm font-normal truncate"
          style={{
            color: done ? "var(--text-secondary)" : "var(--text-primary)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {habit.name}
        </p>
      </div>
    </button>
  );
}
