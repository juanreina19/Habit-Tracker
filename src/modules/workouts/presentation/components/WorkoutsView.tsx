"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useWorkouts } from "../hooks/useWorkouts";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { WeeklyScheduleStrip } from "./WeeklyScheduleStrip";
import { WorkoutCard } from "./WorkoutCard";
import { ExerciseRow } from "./ExerciseRow";
import { WorkoutFormDialog } from "./WorkoutFormDialog";
import { WorkoutStatsPanel } from "./WorkoutStatsPanel";
import { TemplatesExercisesPanel } from "./TemplatesExercisesPanel";
import { dayOfWeek } from "@/shared/lib/utils/dates";
import type { Workout, WorkoutWithStatus } from "../../domain/entities/Workout";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

/**
 * Página única (no tabs, no router split) — mismo patrón de composición que
 * StudiesView.tsx. Jerarquía: header > strip semanal (siempre visible) >
 * workout(s) del día seleccionado (acción principal: marcar completado) >
 * Templates|Exercises (menor prioridad) > widgets a la derecha.
 */
export default function WorkoutsView({ userId }: Props) {
  const t = useTranslations("workouts");
  const workoutsHook = useWorkouts(userId);
  const { categories } = useCategories(userId);

  const [selectedDay, setSelectedDay] = useState(() => dayOfWeek(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

  const openCreate = () => { setEditingWorkout(null); setDialogOpen(true); };
  const openEdit = (w: Workout) => { setEditingWorkout(w); setDialogOpen(true); };
  const handleDelete = async (w: WorkoutWithStatus) => { await workoutsHook.deleteWorkout(w.id); };

  const dayWorkouts = workoutsHook.workouts.filter((w) => w.dayOfWeek === selectedDay);

  if (workoutsHook.isLoading) return <WorkoutsSkeleton />;

  return (
    <>
      <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl" style={{ color: "var(--text-primary)" }}>
              {t("title")}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {t("subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-opacity active:opacity-70"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            <Plus size={14} strokeWidth={1} />
            <span className="hidden lg:inline">{t("add_workout")}</span>
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 mt-6">
          {/* Columna izquierda */}
          <div className="flex flex-col gap-5 lg:pr-3">
            <WeeklyScheduleStrip workouts={workoutsHook.workouts} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            {/* Workout(s) del día seleccionado — jerarquía visual principal */}
            <div className="flex flex-col gap-3">
              {dayWorkouts.length === 0 ? (
                <div className="rounded-lg p-6 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("no_workout_today")}</p>
                </div>
              ) : (
                dayWorkouts.map((w) => (
                  <div key={w.id} className="rounded-lg p-3.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <WorkoutCard
                      workout={w}
                      onToggleComplete={() => workoutsHook.toggleWorkoutCompletion(w)}
                      onEdit={() => openEdit(w)}
                      onDelete={() => handleDelete(w)}
                    />
                    {w.exercises.length > 0 && (
                      <div className="flex flex-col gap-1 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        {w.exercises.map((ex) => (
                          <ExerciseRow key={ex.id} exercise={ex} />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Templates | Exercises — menor prioridad, va debajo */}
            <TemplatesExercisesPanel
              userId={userId}
              workouts={workoutsHook.workouts}
              categories={categories}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Columna derecha — widgets pequeños, se posponen (no se ocultan) en móvil.
              Línea vertical separando las columnas (lg:border-l) + un poco más de
              espacio antes del contenido (lg:pl-8). */}
          <div className="mt-6 lg:mt-0 lg:pl-8 lg:border-l lg:border-l-[var(--border)]">
            <WorkoutStatsPanel stats={workoutsHook.stats} />
          </div>
        </div>
      </div>

      <WorkoutFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workout={editingWorkout}
        userId={userId}
        onCreate={workoutsHook.createWorkout}
        onUpdate={workoutsHook.updateWorkout}
        onDelete={workoutsHook.deleteWorkout}
      />
    </>
  );
}

function WorkoutsSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
      <div className="h-7 w-48 rounded-lg mb-6 skeleton-shimmer" style={{ background: "var(--surface)" }} />
      <div className="flex flex-col gap-3">
        <div className="h-20 rounded-lg skeleton-shimmer" style={{ background: "var(--surface)" }} />
        <div className="h-32 rounded-lg skeleton-shimmer" style={{ background: "var(--surface)" }} />
      </div>
    </div>
  );
}
