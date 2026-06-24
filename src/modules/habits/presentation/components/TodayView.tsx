"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { startOfWeek, parseISO } from "date-fns";
import Link from "next/link";
import { Plus, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { useLocale } from "@/shared/i18n/useLocale";
import { useHabits } from "../hooks/useHabits";
import { useTodayTasks } from "@/modules/tasks/presentation/hooks/useTodayTasks";
import { TaskCard } from "@/modules/tasks/presentation/components/TaskCard";
import { today as todayISODate } from "@/shared/lib/utils/dates";
import { useSettingsHabits } from "../hooks/useSettingsHabits";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { HabitFormDialog } from "./settings/HabitFormDialog";
import { useToast } from "@/shared/components/ui/Toast";
import { Confetti } from "@/shared/components/ui/Confetti";
import type { UUID } from "@/shared/types/database.types";
import type { HabitWithStatus } from "../../domain/entities/Habit";
import type { CreateHabitInput } from "../../domain/repositories/IHabitRepository";

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

export default function TodayView({ userId }: Props) {
  const t = useTranslations("today");
  const tTasks = useTranslations("tasks");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;

  const {
    habits, isLoading, error,
    completedCount, totalCount, completionPercentage, estimatedMinutes,
    completeHabit, uncheckHabit, freezeHabit, refetch,
  } = useHabits(userId);

  const { showToast } = useToast();
  const { create: createHabit } = useSettingsHabits(userId);
  const { categories } = useCategories(userId);
  const [createOpen, setCreateOpen] = useState(false);

  const { tasks: allTodayTasks, toggleTask: toggleTodayTask } = useTodayTasks(userId);
  const todayStr = todayISODate();
  // Excluye tareas atrasadas: aquí solo se muestran las tareas de hoy
  const todayTasks = allTodayTasks.filter((task) => !(task.dueDate && task.dueDate < todayStr));
  const today = new Date();

  // Mostrar errores de carga como toast (no pantalla completa)
  useEffect(() => {
    if (error) showToast({ message: error, duration: 4000 });
  }, [error]);

  const [showConfetti, setShowConfetti] = useState(false);
  const prevPct = useRef(completionPercentage);
  useEffect(() => {
    if (prevPct.current < 100 && completionPercentage === 100 && totalCount > 0) {
      setShowConfetti(true);
    }
    prevPct.current = completionPercentage;
  }, [completionPercentage, totalCount]);

  // Refetch defensivo cuando el diálogo de crear se cierra
  const prevCreateOpen = useRef(createOpen);
  useEffect(() => {
    if (prevCreateOpen.current === true && createOpen === false) {
      refetch();
    }
    prevCreateOpen.current = createOpen;
  }, [createOpen, refetch]);

  const pendingIds = useRef<Set<UUID>>(new Set());

  const handleToggle = (habit: HabitWithStatus) => {
    if (pendingIds.current.has(habit.id)) return;
    pendingIds.current.add(habit.id);

    if (habit.isCompletedToday) {
      const cancel = uncheckHabit(habit.id);
      setTimeout(() => pendingIds.current.delete(habit.id), 3100);
      showToast({
        message: t("habit_unchecked"),
        actionLabel: t("undo"),
        onAction: () => {
          pendingIds.current.delete(habit.id);
          cancel();
        },
        duration: 3000,
      });
    } else {
      completeHabit(habit.id).finally(() => pendingIds.current.delete(habit.id));
    }
  };

  const handleFreeze = async (habitId: UUID) => {
    try {
      await freezeHabit(habitId);
      showToast({ message: t("streak_saved"), duration: 2500 });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Error", duration: 3000 });
    }
  };


  const GROUP_LABELS: Record<string, string> = {
    morning: t("morning"),
    afternoon: t("afternoon"),
    evening: t("evening"),
    none: t("no_time"),
  };

  if (isLoading) return <TodayViewSkeleton />;

  // Solo cuenta hábitos completados HOY: al desmarcar (optimista isCompletedToday=false)
  // ese hábito sale del cálculo y 🔥 desaparece de inmediato.
  const maxStreak = Math.max(
    0,
    ...habits
      .filter((h) => h.isCompletedToday)
      .map((h) => h.streak?.currentStreak ?? 0)
  );

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
        {/* Header — 3 columnas: fecha | Hoy+racha | + (móvil; en desktop vive dentro de la columna de hábitos) */}
        <div className="flex items-center mb-8 lg:hidden">
          {/* Izquierda: fecha */}
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {format(today, "d MMMM", { locale: dateFnsLocale }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>

          {/* Centro: "Hoy" + racha */}
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("today_label")}
            </span>
            {maxStreak > 0 && (
              <>
                <span className="text-base leading-none">🔥</span>
                <span className="text-sm font-bold" style={{ color: "#FF9500" }}>{maxStreak}</span>
              </>
            )}
          </div>

          {/* Derecha: botón + (solo ícono, móvil) */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setCreateOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              aria-label={t("new_habit")}
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[18fr_7fr] lg:gap-4 lg:items-start">
        {/* Columna izquierda: progreso + hábitos */}
        <div className="flex flex-col gap-3 min-w-0">

        {/* Header — desktop, dentro de la columna de hábitos */}
        <div className="hidden lg:flex items-center mb-1">
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {format(today, "d MMMM", { locale: dateFnsLocale }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("today_label")}
            </span>
            {maxStreak > 0 && (
              <>
                <span className="text-base leading-none">🔥</span>
                <span className="text-sm font-bold" style={{ color: "#FF9500" }}>{maxStreak}</span>
              </>
            )}
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-opacity active:opacity-70"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span className="text-sm font-semibold">{t("new_habit")}</span>
            </button>
          </div>
        </div>

        {/* Progress ring — mobile (horizontal, compacto) */}
        {totalCount > 0 && (
          <div
            className="lg:hidden rounded-xl p-5 flex items-center gap-5"
            style={{ background: "var(--surface)" }}
          >
            <ProgressRing percentage={completionPercentage} size={72} />
            <div>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {completedCount}/{totalCount}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{t("habits_completed")}</p>
              {estimatedMinutes > 0 && (
                <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                  {t("remaining_min", { n: estimatedMinutes })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress ring — desktop (vertical, anillo grande) */}
        {totalCount > 0 && (
          <div
            className="hidden lg:flex flex-col items-center text-center rounded-xl p-6"
            style={{ background: "var(--surface)" }}
          >
            <ProgressRing percentage={completionPercentage} size={120} />
            <p className="text-2xl font-semibold mt-4" style={{ color: "var(--text-primary)" }}>
              {completedCount}/{totalCount}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{t("habits_completed")}</p>
            {estimatedMinutes > 0 && (
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                {t("remaining_min", { n: estimatedMinutes })}
              </p>
            )}
          </div>
        )}

        {/* Habit list grouped by time of day */}
        <div className="flex flex-col gap-3 lg:overflow-y-auto lg:pr-0.5 lg:max-h-[min(620px,60vh)]">
          {totalCount === 0 && (
            <div className="rounded-xl p-8 text-center" style={{ background: "var(--surface)" }}>
              <p className="text-4xl mb-3">✨</p>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>{t("no_habits_title")}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t("no_habits_hint")}</p>
            </div>
          )}

          {(["morning", "afternoon", "evening", "none"] as const).map((groupKey) => {
            const groupHabits = [...habits]
              .filter((h) => {
                if (groupKey === "morning") return !!h.startTime && h.startTime < "12:00";
                if (groupKey === "afternoon") return !!h.startTime && h.startTime >= "12:00" && h.startTime < "18:00";
                if (groupKey === "evening") return !!h.startTime && h.startTime >= "18:00";
                return !h.startTime;
              })
              .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

            if (groupHabits.length === 0) return null;

            return (
              <div key={groupKey}>
                <div className="flex items-center gap-2 mb-2 mt-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    {GROUP_LABELS[groupKey]}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
                </div>
                <div className="flex flex-col gap-3">
                  {groupHabits.map((habit, index) => {
                    const locked = isHabitLocked(habit);
                    return (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                      >
                        <HabitRow
                          habit={habit}
                          locked={locked}
                          onToggle={() => !locked && handleToggle(habit)}
                          onFreeze={canFreeze(habit) ? () => handleFreeze(habit.id) : undefined}
                          freezeLabel={t("save_streak")}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* Columna derecha: tareas pendientes de hoy */}
        <div className="flex flex-col gap-2.5 min-w-0 mt-6 lg:mt-0">
          {todayTasks.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  {tTasks("today_tasks")}
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
                <Link
                  href="/tasks"
                  className="text-xs font-medium"
                  style={{ color: "var(--accent, #3b82f6)" }}
                >
                  {tTasks("see_all")} →
                </Link>
              </div>
              <div className="flex flex-col gap-2 lg:overflow-y-auto lg:pr-0.5 lg:max-h-[min(620px,60vh)]">
                {todayTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                  >
                    <Link href="/tasks" className="block">
                      <TaskCard
                        task={task}
                        onToggle={() => toggleTodayTask(task)}
                        compact
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      <HabitFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        habit={null}
        categories={categories}
        onSave={async (data) => {
          await createHabit(data as CreateHabitInput);
          await refetch();
          // dialog closed by handleSave after this returns
        }}
      />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HabitRow({
  habit, locked, onToggle, onFreeze, freezeLabel,
}: {
  habit: HabitWithStatus;
  locked: boolean;
  onToggle: () => void;
  onFreeze?: () => void;
  freezeLabel: string;
}) {
  const t = useTranslations("today");
  const accentColor = habit.color ?? "#4CAF82";
  const expired = locked && !habit.isCompletedToday;

  return (
    <motion.div
      layout="position"
      drag={locked ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.05, right: 0.3 }}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        if (!locked && info.offset.x > 60 && Math.abs(info.velocity.x) > 0) onToggle();
      }}
      onClick={locked ? undefined : onToggle}
      className="w-full text-left rounded-lg p-4 flex items-center gap-4 relative overflow-hidden"
      style={{
        background: habit.isCompletedToday ? `${accentColor}28` : "var(--surface)",
        border: `1px solid ${habit.isCompletedToday ? `${accentColor}58` : locked ? "transparent" : `${accentColor}22`}`,
        opacity: locked ? 0.5 : 1,
        cursor: locked ? "not-allowed" : "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      whileTap={locked ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    >
      {/* Animated checkbox */}
      <motion.div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        animate={{
          backgroundColor: habit.isCompletedToday ? accentColor : "transparent",
          borderColor: habit.isCompletedToday ? accentColor : "var(--border)",
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
      {habit.icon && (
        <span className="flex-shrink-0" style={{ color: accentColor }}>
          <HabitIcon icon={habit.icon} size={22} />
        </span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium truncate"
          style={{
            color: habit.isCompletedToday ? "var(--text-secondary)" : "var(--text-primary)",
            textDecoration: habit.isCompletedToday ? "line-through" : "none",
          }}
        >
          {habit.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {habit.startTime && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              <Clock size={11} strokeWidth={2} />
              <span>
                {habit.startTime}
                {habit.estimatedMinutes ? ` – ${calcEndTime(habit.startTime, habit.estimatedMinutes)}` : ""}
              </span>
            </span>
          )}
          {!habit.startTime && habit.estimatedMinutes && (
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {habit.estimatedMinutes} min
            </span>
          )}
        </div>
      </div>

      {/* Expired badge */}
      {expired && (
        <span
          className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: "#ef444415", color: "#ef4444" }}
        >
          {t("expired")}
        </span>
      )}

      {/* Freeze button */}
      {onFreeze && (
        <button
          onClick={(e) => { e.stopPropagation(); onFreeze(); }}
          className="flex-shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium transition-opacity active:opacity-60"
          style={{ background: "rgba(100,160,255,0.12)", color: "#88AAFF" }}
        >
          {freezeLabel}
        </button>
      )}
    </motion.div>
  );
}

function ProgressRing({ percentage, size }: { percentage: number; size: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={4} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={percentage === 100 ? "var(--accent)" : "var(--text-primary)"}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="rotate-90"
        style={{
          fill: "var(--text-primary)", fontSize: size * 0.22, fontWeight: 600,
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
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10 skeleton-shimmer">
      <div className="mb-8">
        <div className="h-4 w-20 rounded-full mb-2" style={{ background: "var(--surface)" }} />
        <div className="h-8 w-48 rounded-full" style={{ background: "var(--surface)" }} />
      </div>
      <div className="rounded-xl h-24 mb-6" style={{ background: "var(--surface)" }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg h-16 mb-3" style={{ background: "var(--surface)" }} />
      ))}
    </div>
  );
}
