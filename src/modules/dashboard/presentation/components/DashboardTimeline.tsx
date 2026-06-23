"use client";

import { useMemo } from "react";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";

interface Props {
  tasks: TaskWithStatus[];
  habits: HabitWithStatus[];
}

interface TimeBlock {
  id: string;
  label: string;
  startMin: number;
  endMin: number;
  color: string;
  type: "task" | "habit";
}

const TIMELINE_START = 6;
const TIMELINE_END = 23;
const TOTAL_MIN = (TIMELINE_END - TIMELINE_START) * 60;
const HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function DashboardTimeline({ tasks, habits }: Props) {
  const blocks = useMemo(() => {
    const result: TimeBlock[] = [];

    for (const task of tasks) {
      if (!task.startTime) continue;
      const start = parseTime(task.startTime);
      const end = task.endTime ? parseTime(task.endTime) : start + 30;
      result.push({
        id: `task-${task.id}`,
        label: task.title,
        startMin: start,
        endMin: end,
        color: "var(--accent)",
        type: "task",
      });
    }

    const today = new Date();
    const dow = today.getDay() === 0 ? 7 : today.getDay();
    for (const habit of habits) {
      if (!habit.startTime || !habit.activeDays.includes(dow)) continue;
      const start = parseTime(habit.startTime);
      const end = start + (habit.estimatedMinutes ?? 30);
      result.push({
        id: `habit-${habit.id}`,
        label: habit.name,
        startMin: start,
        endMin: end,
        color: habit.color ?? "#4CAF82",
        type: "habit",
      });
    }

    return result.sort((a, b) => a.startMin - b.startMin);
  }, [tasks, habits]);

  if (blocks.length === 0) return null;

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nowPct = ((nowMin - TIMELINE_START * 60) / TOTAL_MIN) * 100;
  const showNow = nowPct >= 0 && nowPct <= 100;

  return (
    <div className="hidden lg:block w-full rounded-[16px] p-4" style={{ background: "var(--surface)" }}>
      <div className="relative w-full" style={{ height: 56 }}>
        {/* Hour marks */}
        <div className="absolute inset-x-0 top-0 flex">
          {HOURS.map((h) => {
            const pct = ((h - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
            return (
              <div
                key={h}
                className="absolute text-[10px] font-medium"
                style={{ left: `${pct}%`, color: "var(--text-muted)", transform: "translateX(-50%)" }}
              >
                {String(h).padStart(2, "0")}
              </div>
            );
          })}
        </div>

        {/* Track */}
        <div
          className="absolute left-0 right-0 rounded-full"
          style={{ top: 22, height: 4, background: "var(--border)", opacity: 0.5 }}
        />

        {/* Now indicator */}
        {showNow && (
          <div
            className="absolute rounded-full"
            style={{ left: `${nowPct}%`, top: 18, width: 3, height: 12, background: "#ef4444", transform: "translateX(-50%)", zIndex: 10 }}
          />
        )}

        {/* Blocks */}
        {blocks.map((block) => {
          const left = ((block.startMin - TIMELINE_START * 60) / TOTAL_MIN) * 100;
          const width = ((block.endMin - block.startMin) / TOTAL_MIN) * 100;
          return (
            <div
              key={block.id}
              className="absolute rounded-[6px] flex items-center px-1.5 overflow-hidden"
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(2, width)}%`,
                top: 30,
                height: 22,
                background: `${block.color}20`,
                border: `1px solid ${block.color}40`,
              }}
              title={block.label}
            >
              <span className="text-[9px] font-medium truncate" style={{ color: block.color }}>
                {block.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
