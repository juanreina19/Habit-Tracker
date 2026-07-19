"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutWithStatus | null>(null);

  const openCreate = () => { setEditingWorkout(null); setDialogOpen(true); };
  const openEdit = (w: Workout) => { setEditingWorkout(w); setDialogOpen(true); };
  const requestDelete = (w: WorkoutWithStatus) => setDeletingWorkout(w);
  const confirmDeleteWorkout = async () => {
    if (!deletingWorkout) return;
    const w = deletingWorkout;
    setDeletingWorkout(null);
    await workoutsHook.deleteWorkout(w.id);
  };

  const dayWorkouts = workoutsHook.workouts.filter((w) => w.dayOfWeek.includes(selectedDay));

  if (workoutsHook.isLoading) return <WorkoutsSkeleton />;

  return (
    <>
      <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-14">
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
            <Plus size={14} strokeWidth={2} />
            <span className="hidden lg:inline">{t("add_workout")}</span>
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_420px] mt-6">
          {/* Columna izquierda */}
          <div className="flex flex-col gap-5 lg:pl-8 lg:pr-12">
            <WeeklyScheduleStrip workouts={workoutsHook.workouts} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

            {/* Workout(s) del día seleccionado — jerarquía visual principal */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3"
              >
                {dayWorkouts.length === 0 ? (
                  <div className="rounded-lg p-6 text-center glass-panel">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("no_workout_today")}</p>
                  </div>
                ) : (
                  dayWorkouts.map((w) => (
                    <div key={w.id} className="rounded-lg p-3 glass-panel-strong">
                      <WorkoutCard
                        workout={w}
                        onEdit={() => openEdit(w)}
                        onDelete={() => requestDelete(w)}
                      />
                      {w.exercises.length > 0 && (
                        <div className="flex flex-col gap-2 mt-1.5 pl-3">
                          {w.exercises.map((ex) => (
                            <ExerciseRow key={ex.id} exercise={ex} variant="card" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>

            {/* Templates | Exercises — menor prioridad, va debajo */}
            <TemplatesExercisesPanel
              userId={userId}
              workouts={workoutsHook.workouts}
              categories={categories}
              onEdit={openEdit}
              onDelete={requestDelete}
            />
          </div>

          {/* Columna derecha — widgets pequeños, se posponen (no se ocultan) en móvil.
              Línea vertical separando las columnas (lg:border-l) + un poco más de
              espacio antes del contenido (lg:pl-8). */}
          <div className="mt-6 lg:mt-0 lg:pl-12 lg:border-l lg:border-l-[var(--border)]">
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

      {deletingWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setDeletingWorkout(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6 glass-panel-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              {t("delete_workout_confirm")}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingWorkout(null)}
                className="flex-1 py-2 rounded-md text-sm"
                style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmDeleteWorkout}
                className="flex-1 py-2 rounded-md text-sm"
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
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
