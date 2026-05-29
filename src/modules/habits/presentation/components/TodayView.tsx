"use client";

import { useHabits } from "../hooks/useHabits";
import type { UUID } from "@/shared/types/database.types";
import { formatFriendly } from "@/shared/lib/utils/dates";

interface Props {
  userId: UUID;
}

export default function TodayView({ userId }: Props) {
  const {
    habits,
    isLoading,
    error,
    completedCount,
    totalCount,
    completionPercentage,
    estimatedMinutes,
    toggleHabitCompletion,
  } = useHabits(userId);

  const today = new Date();

  if (isLoading) {
    return <TodayViewSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 pt-14 flex items-center justify-center min-h-screen">
        <p className="text-sm" style={{ color: "#FF5252" }}>
          Error: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium" style={{ color: "#8888AA" }}>
          {formatFriendly(today)}
        </p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "#FFFFFF" }}>
          {completionPercentage === 100 ? "¡Día perfecto! 🎉" : "Buenos días"}
        </h1>
      </div>

      {/* Progress ring / summary */}
      {totalCount > 0 && (
        <div
          className="rounded-[20px] p-5 mb-6 flex items-center gap-5"
          style={{ background: "#1A1A2E" }}
        >
          <ProgressRing percentage={completionPercentage} size={72} />
          <div>
            <p className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
              {completedCount}/{totalCount}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#8888AA" }}>
              hábitos completados
            </p>
            {estimatedMinutes > 0 && (
              <p className="text-xs mt-2" style={{ color: "#8888AA" }}>
                ~{estimatedMinutes} min restantes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Habit list */}
      <div className="flex flex-col gap-3">
        {totalCount === 0 && (
          <div
            className="rounded-[20px] p-8 text-center"
            style={{ background: "#1A1A2E" }}
          >
            <p className="text-4xl mb-3">✨</p>
            <p className="font-medium" style={{ color: "#FFFFFF" }}>Sin hábitos para hoy</p>
            <p className="text-sm mt-1" style={{ color: "#8888AA" }}>
              Ve a Ajustes para crear tus primeros hábitos.
            </p>
          </div>
        )}

        {habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            onToggle={() => toggleHabitCompletion(habit.id, habit.isCompletedToday)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HabitRow({
  habit,
  onToggle,
}: {
  habit: { id: string; name: string; icon: string | null; color: string | null;
    estimatedMinutes: number | null; isCompletedToday: boolean;
    streak: { currentStreak: number } | null };
  onToggle: () => void;
}) {
  const accentColor = habit.color ?? "#4CAF82";

  return (
    <button
      onClick={onToggle}
      className="w-full text-left rounded-[16px] p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
      style={{
        background: habit.isCompletedToday
          ? `${accentColor}18`
          : "#1A1A2E",
        border: `1px solid ${habit.isCompletedToday ? `${accentColor}40` : "transparent"}`,
      }}
    >
      {/* Checkbox */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: habit.isCompletedToday ? accentColor : "transparent",
          border: `2px solid ${habit.isCompletedToday ? accentColor : "#252540"}`,
        }}
      >
        {habit.isCompletedToday && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Icon */}
      {habit.icon && (
        <span className="text-xl flex-shrink-0">{habit.icon}</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium truncate"
          style={{
            color: habit.isCompletedToday ? "#8888AA" : "#FFFFFF",
            textDecoration: habit.isCompletedToday ? "line-through" : "none",
          }}
        >
          {habit.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {habit.streak && habit.streak.currentStreak > 0 && (
            <span className="text-xs" style={{ color: "#8888AA" }}>
              🔥 {habit.streak.currentStreak} días
            </span>
          )}
          {habit.estimatedMinutes && (
            <span className="text-xs" style={{ color: "#8888AA" }}>
              {habit.estimatedMinutes} min
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ProgressRing({ percentage, size }: { percentage: number; size: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#252540" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={percentage === 100 ? "#4CAF82" : "#FFFFFF"}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="rotate-90"
        style={{
          fill: "#FFFFFF",
          fontSize: size * 0.22,
          fontWeight: 600,
          transformOrigin: `${size / 2}px ${size / 2}px`,
        }}
      >
        {percentage}%
      </text>
    </svg>
  );
}

function TodayViewSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-4 w-20 rounded-full mb-2" style={{ background: "#1A1A2E" }} />
        <div className="h-8 w-48 rounded-full" style={{ background: "#1A1A2E" }} />
      </div>
      <div className="rounded-[20px] h-24 mb-6" style={{ background: "#1A1A2E" }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[16px] h-16 mb-3" style={{ background: "#1A1A2E" }} />
      ))}
    </div>
  );
}
