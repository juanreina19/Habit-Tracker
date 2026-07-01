"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ClipboardPen, Repeat, Filter, Pencil } from "lucide-react";
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
  onToggleOverdueTask?: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
  onCreateTask: (title: string) => void;
  onCompleteHabit: (habitId: string) => void;
  onUncheckHabit: (habitId: string) => void;
  onEditHabit?: (habitId: string) => void;
}

interface AgendaItem {
  type: "task" | "habit";
  id: string;
  time: string | null;
  rawTime: string | null;
  completed: boolean;
  task?: TaskWithStatus;
  habit?: HabitWithStatus;
}

export function EnfoqueTab({
  todayTasks, habits, overdue,
  onToggleTask, onToggleOverdueTask, onEditTask, onDeleteTask, onCreateTask,
  onCompleteHabit, onUncheckHabit, onEditHabit,
}: Props) {
  const toggleOverdue = onToggleOverdueTask ?? onToggleTask;
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
        rawTime: task.startTime?.slice(0, 5) ?? null,
        completed: isTaskDone(task),
        task,
      });
    }

    for (const habit of habits) {
      items.push({
        type: "habit",
        id: habit.id,
        time: habit.startTime ? formatTaskTime(habit.startTime) : null,
        rawTime: habit.startTime?.slice(0, 5) ?? null,
        completed: habit.isCompletedToday,
        habit,
      });
    }

    return items.sort((a, b) => {
      if (a.rawTime && !b.rawTime) return -1;
      if (!a.rawTime && b.rawTime) return 1;
      if (a.rawTime && b.rawTime) return a.rawTime.localeCompare(b.rawTime);
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
              background: urgencyFilter ? "var(--text-primary)" : "var(--surface-elevated)",
              color: urgencyFilter ? "var(--bg)" : "var(--text-muted)",
            }}
          >
            <Filter size={10} strokeWidth={1.5} />
            {t("filter_urgent")}
          </button>
        </div>
        <InlineTaskInput onCreateTask={onCreateTask} />

        {/* Timeline */}
        <div className="flex flex-col relative">
          {/* Continuous vertical line */}
          {agendaItems.length > 1 && (
            <div
              className="absolute w-px"
              style={{
                background: "var(--border)",
                left: "calc(3.5rem + 0.75rem)",
                top: 0,
                bottom: 0,
              }}
            />
          )}
          <AnimatePresence initial={false}>
          {agendaItems.map((item) => {
            const timeParts = item.time?.split(" ") ?? [];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center"
              >
                {/* Time label */}
                <div className="w-14 flex-shrink-0 text-right pr-3">
                  {timeParts[0] && (
                    <>
                      <span className="text-[11px] tabular-nums font-normal leading-none block" style={{ color: "var(--text-muted)" }}>
                        {timeParts[0]}
                      </span>
                      {timeParts[1] && (
                        <span className="text-[9px] font-normal leading-none block mt-px" style={{ color: "var(--text-muted)" }}>
                          {timeParts[1]}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Node */}
                <div className="w-6 flex-shrink-0 flex items-center justify-center relative z-10">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: item.completed ? "#FFFFFF" : "var(--bg)",
                      border: item.completed ? "2px solid #FFFFFF" : "1px solid var(--border)",
                    }}
                  >
                    {item.type === "habit"
                      ? <Repeat size={11} strokeWidth={1.5} style={{ color: item.completed ? "var(--bg)" : "var(--text-muted)" }} />
                      : <ClipboardPen size={11} strokeWidth={1.5} style={{ color: item.completed ? "var(--bg)" : "var(--text-muted)" }} />
                    }
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0 py-1 pl-2">
                  {item.type === "task" && item.task && (
                    <TaskCardDashboard
                      task={item.task}
                      onToggle={() => onToggleTask(item.task!)}
                      onEdit={() => onEditTask(item.task!)}
                      onDelete={() => onDeleteTask(item.task!)}
                      showDescription
                      typeLabel={t("type_task")}
                    />
                  )}
                  {item.type === "habit" && item.habit && (
                    <HabitAgendaRow
                      habit={item.habit}
                      onToggle={() => {
                        if (item.habit!.isCompletedToday) onUncheckHabit(item.habit!.id);
                        else onCompleteHabit(item.habit!.id);
                      }}
                      onEdit={onEditHabit ? () => onEditHabit(item.habit!.id) : undefined}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
          {agendaItems.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>—</p>
          )}
        </div>
      </div>

      {/* Overdue / Vencidas — timeline without time, just line + icons */}
      <div className="flex flex-col gap-3">
        <SectionHeader label={t("overdue").toUpperCase()} />
        <div className="flex flex-col relative">
          {/* Continuous vertical line */}
          {overdue.length > 1 && (
            <div
              className="absolute w-px"
              style={{
                background: "var(--border)",
                left: "0.75rem",
                top: 0,
                bottom: 0,
              }}
            />
          )}
          {overdue.map((task, idx) => {
            const done = isTaskDone(task);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="flex items-center"
              >
                {/* Node */}
                <div className="w-6 flex-shrink-0 flex items-center justify-center relative z-10">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: done ? "#FFFFFF" : "var(--bg)",
                      border: done ? "2px solid #FFFFFF" : "1px solid var(--border)",
                    }}
                  >
                    <ClipboardPen size={10} strokeWidth={1.5} style={{ color: done ? "var(--bg)" : "var(--text-muted)" }} />
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0 py-1 pl-2">
                  <TaskCardDashboard
                    task={task}
                    onToggle={() => toggleOverdue(task)}
                    onEdit={() => onEditTask(task)}
                    onDelete={() => onDeleteTask(task)}
                    overdue
                    showDescription
                    showDueDate
                    typeLabel={t("type_task")}
                  />
                </div>
              </motion.div>
            );
          })}
          {overdue.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>—</p>
          )}
        </div>
      </div>
    </div>
  );
}


function HabitAgendaRow({ habit, onToggle, onEdit }: { habit: HabitWithStatus; onToggle: () => void; onEdit?: () => void }) {
  const t = useTranslations("dashboard");
  const done = habit.isCompletedToday;

  return (
    <div
      className="group w-full rounded-md p-2.5 flex items-center gap-3 card-border-hover"
      style={{
        background: "var(--bg)",
        border: done ? "1px solid transparent" : "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98]"
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
              <path d="M1 5l3.5 3.5L11 1" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
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
          {!done && (
            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>
              {t("type_habit")}
            </span>
          )}
        </div>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded-sm active:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <Pencil size={12} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
