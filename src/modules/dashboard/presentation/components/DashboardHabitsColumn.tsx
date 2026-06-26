"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings2, Flame } from "lucide-react";
import { DashboardColumn } from "./DashboardColumn";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";

interface Props {
  habits: HabitWithStatus[];
  onComplete: (habitId: string) => void;
  onUncheck: (habitId: string) => void;
}

export function DashboardHabitsColumn({ habits, onComplete, onUncheck }: Props) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  const todayHabits = habits.filter(h => {
    const today = new Date();
    const dow = today.getDay() === 0 ? 7 : today.getDay();
    return h.activeDays.includes(dow);
  });

  const completed = todayHabits.filter(h => h.isCompletedToday).length;

  const formatTime = (startTime: string | null, estimatedMinutes: number | null): string | null => {
    if (!startTime) return null;
    const start = formatTaskTime(startTime);
    if (!estimatedMinutes) return start;
    const [h, m] = startTime.split(":").map(Number);
    const endMin = h * 60 + m + estimatedMinutes;
    const endH = Math.floor(endMin / 60) % 24;
    const endM = endMin % 60;
    return `${start} – ${formatTaskTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`)}`;
  };

  return (
    <DashboardColumn
      title={t("habits")}
      count={todayHabits.length}
      color="#4CAF82"
      headerRight={
        <button
          type="button"
          onClick={() => router.push("/habits")}
          className="w-6 h-6 rounded-sm flex items-center justify-center transition-opacity active:opacity-70"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("manage_habits")}
        >
          <Settings2 size={13} />
        </button>
      }
    >
      {todayHabits.length === 0 ? (
        <div className="rounded-md py-4 text-center text-xs" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
          —
        </div>
      ) : (
        todayHabits.map((habit) => {
          const done = habit.isCompletedToday;
          const time = formatTime(habit.startTime, habit.estimatedMinutes);
          const streak = habit.streak?.currentStreak ?? 0;
          const accentColor = habit.color ?? "#4CAF82";

          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => done ? onUncheck(habit.id) : onComplete(habit.id)}
              className="flex items-center gap-2.5 rounded-md p-2.5 text-left transition-opacity active:opacity-70 w-full"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              {/* Checkbox */}
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity"
                style={{
                  background: done ? "#FFFFFF" : "transparent",
                  border: done ? "2px solid #FFFFFF" : "2px solid var(--border)",
                }}
              >
                {done && (
                  <svg width={10} height={10} viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>

              {/* Icon */}
              {habit.icon && (
                <span className="flex-shrink-0" style={{ color: done ? "var(--text-muted)" : "var(--text-secondary)" }}>
                  <HabitIcon icon={habit.icon} size={16} />
                </span>
              )}

              {/* Name */}
              <span
                className="flex-1 min-w-0 text-sm font-normal truncate"
                style={{
                  color: done ? "var(--text-muted)" : "var(--text-primary)",
                  textDecoration: done ? "line-through" : "none",
                }}
              >
                {habit.name}
              </span>

              {/* Time + streak */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {time && (
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {time}
                  </span>
                )}
                {streak > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                    <Flame size={10} fill="currentColor" />
                    {streak}
                  </span>
                )}
              </div>
            </button>
          );
        })
      )}
    </DashboardColumn>
  );
}
