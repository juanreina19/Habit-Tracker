"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { startOfWeek, parseISO } from "date-fns";
import { useHabits } from "../hooks/useHabits";
import { useToast } from "@/shared/components/ui/Toast";
import { Confetti } from "@/shared/components/ui/Confetti";
import type { UUID } from "@/shared/types/database.types";
import type { HabitWithStatus } from "../../domain/entities/Habit";

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const base = h >= 5 && h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  return name ? `${base}, ${name}!` : `${base}!`;
}

function calcEndTime(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isHabitLocked(habit: HabitWithStatus): boolean {
  if (!habit.startTime || !habit.estimatedMinutes) return false;
  const now = new Date();
  const [h, m] = habit.startTime.split(":").map(Number);
  const endMinutes = h * 60 + m + habit.estimatedMinutes;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > endMinutes;
}

function canFreeze(habit: HabitWithStatus): boolean {
  if (habit.isCompletedToday || !habit.streak || habit.streak.currentStreak === 0) return false;
  if (!habit.streak.freezeUsedAt) return true;
  const freezeDate = parseISO(habit.streak.freezeUsedAt);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  return freezeDate < weekStart;
}

interface Props {
  userId: UUID;
  userName?: string;
}

export default function TodayView({ userId, userName = "" }: Props) {
  const {
    habits, isLoading, error,
    completedCount, totalCount, completionPercentage, estimatedMinutes,
    completeHabit, uncheckHabit, freezeHabit,
  } = useHabits(userId);

  const { showToast } = useToast();
  const today = new Date();

  // Confetti on 100% completion
  const [showConfetti, setShowConfetti] = useState(false);
  const prevPct = useRef(completionPercentage);
  useEffect(() => {
    if (prevPct.current < 100 && completionPercentage === 100 && totalCount > 0) {
      setShowConfetti(true);
    }
    prevPct.current = completionPercentage;
  }, [completionPercentage, totalCount]);

  const handleToggle = (habit: HabitWithStatus) => {
    if (habit.isCompletedToday) {
      const cancel = uncheckHabit(habit.id);
      showToast({
        message: "Hábito desmarcado",
        actionLabel: "Deshacer",
        onAction: cancel,
        duration: 3000,
      });
    } else {
      completeHabit(habit.id);
    }
  };

  const handleFreeze = async (habitId: UUID) => {
    try {
      await freezeHabit(habitId);
      showToast({ message: "¡Racha salvada! 🧊", duration: 2500 });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Error al congelar racha", duration: 3000 });
    }
  };

  if (isLoading) return <TodayViewSkeleton />;

  if (error) {
    return (
      <div className="p-6 pt-14 flex items-center justify-center min-h-screen">
        <p className="text-sm" style={{ color: "#FF5252" }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium" style={{ color: "#8888AA" }}>
            {"Hoy, " + format(today, "d MMMM", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
          </p>
          <h1 className="text-3xl font-semibold mt-1" style={{ color: "#FFFFFF" }}>
            {completionPercentage === 100 ? "¡Día perfecto! 🎉" : getGreeting(userName)}
          </h1>
        </div>

        {/* Progress ring / summary */}
        {totalCount > 0 && (
          <div
            className="rounded-[20px] p-5 mb-6 flex items-center gap-5"
            style={{ background: "#111111" }}
          >
            <ProgressRing percentage={completionPercentage} size={72} />
            <div>
              <p className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
                {completedCount}/{totalCount}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#8888AA" }}>hábitos completados</p>
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
            <div className="rounded-[20px] p-8 text-center" style={{ background: "#111111" }}>
              <p className="text-4xl mb-3">✨</p>
              <p className="font-medium" style={{ color: "#FFFFFF" }}>Sin hábitos para hoy</p>
              <p className="text-sm mt-1" style={{ color: "#8888AA" }}>
                Ve a Ajustes para crear tus primeros hábitos.
              </p>
            </div>
          )}

          {[...habits]
            .sort((a, b) => {
              if (!a.startTime && !b.startTime) return 0;
              if (!a.startTime) return 1;
              if (!b.startTime) return -1;
              return a.startTime.localeCompare(b.startTime);
            })
            .map((habit) => {
              const locked = isHabitLocked(habit);
              return (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  locked={locked}
                  onToggle={() => !locked && handleToggle(habit)}
                  onFreeze={canFreeze(habit) ? () => handleFreeze(habit.id) : undefined}
                />
              );
            })}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HabitRow({
  habit, locked, onToggle, onFreeze,
}: {
  habit: HabitWithStatus;
  locked: boolean;
  onToggle: () => void;
  onFreeze?: () => void;
}) {
  const accentColor = habit.color ?? "#4CAF82";

  return (
    <motion.button
      layout
      onClick={onToggle}
      disabled={locked}
      className="w-full text-left rounded-[16px] p-4 flex items-center gap-4"
      style={{
        background: habit.isCompletedToday ? `${accentColor}18` : "#111111",
        border: `1px solid ${habit.isCompletedToday ? `${accentColor}40` : "transparent"}`,
        opacity: locked ? 0.5 : 1,
        cursor: locked ? "not-allowed" : "pointer",
      }}
      whileTap={locked ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Animated checkbox */}
      <motion.div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        animate={{
          backgroundColor: habit.isCompletedToday ? accentColor : "transparent",
          borderColor: habit.isCompletedToday ? accentColor : "#2A2A2A",
        }}
        transition={{ duration: 0.2 }}
        style={{ border: "2px solid" }}
      >
        <AnimatePresence mode="wait">
          {habit.isCompletedToday && (
            <motion.svg
              key="check"
              width="12" height="10" viewBox="0 0 12 10" fill="none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Icon */}
      {habit.icon && <span className="text-xl flex-shrink-0">{habit.icon}</span>}

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
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {habit.startTime && (
            <span className="text-xs" style={{ color: locked ? "#FF5252" : "#8888AA" }}>
              {locked ? "🔒 " : ""}{habit.startTime}
              {habit.estimatedMinutes ? ` – ${calcEndTime(habit.startTime, habit.estimatedMinutes)}` : ""}
            </span>
          )}
          {habit.streak && habit.streak.currentStreak > 0 && (
            <span className="text-xs" style={{ color: "#8888AA" }}>
              🔥 {habit.streak.currentStreak} días
            </span>
          )}
          {!habit.startTime && habit.estimatedMinutes && (
            <span className="text-xs" style={{ color: "#8888AA" }}>
              {habit.estimatedMinutes} min
            </span>
          )}
        </div>
      </div>

      {/* Freeze button */}
      {onFreeze && (
        <button
          onClick={(e) => { e.stopPropagation(); onFreeze(); }}
          className="flex-shrink-0 px-2.5 py-1.5 rounded-[10px] text-xs font-medium transition-opacity active:opacity-60"
          style={{ background: "rgba(100,160,255,0.12)", color: "#88AAFF" }}
        >
          🧊 Salvar
        </button>
      )}
    </motion.button>
  );
}

function ProgressRing({ percentage, size }: { percentage: number; size: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={4} />
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
          fill: "#FFFFFF", fontSize: size * 0.22, fontWeight: 600,
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
        <div className="h-4 w-20 rounded-full mb-2" style={{ background: "#111111" }} />
        <div className="h-8 w-48 rounded-full" style={{ background: "#111111" }} />
      </div>
      <div className="rounded-[20px] h-24 mb-6" style={{ background: "#111111" }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[16px] h-16 mb-3" style={{ background: "#111111" }} />
      ))}
    </div>
  );
}
