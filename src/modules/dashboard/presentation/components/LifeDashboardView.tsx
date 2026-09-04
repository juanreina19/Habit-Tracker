"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "../hooks/useDashboard";
import { useWorkouts } from "@/modules/workouts/presentation/hooks/useWorkouts";
import { dayOfWeek } from "@/shared/lib/utils/dates";
import { useTranslations } from "next-intl";
import { useToast } from "@/shared/components/ui/Toast";
import { MotivationalHeader } from "./MotivationalHeader";
import { HomeTabBar, type HomeTab } from "./HomeTabBar";
import { EnfoqueTab } from "./EnfoqueTab";
import { TableroTab } from "./TableroTab";
import { KanbanTab } from "./KanbanTab";
import { DataErrorBanner } from "./DataErrorBanner";
import { TaskFormDialog } from "@/modules/tasks/presentation/components/TaskFormDialog";
import { HabitFormDialog } from "@/modules/habits/presentation/components/settings/HabitFormDialog";
import { useSettingsHabits } from "@/modules/habits/presentation/hooks/useSettingsHabits";
import type { CreateHabitInput, UpdateHabitInput } from "@/modules/habits/domain/repositories/IHabitRepository";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";
import type { TaskWithStatus, CreateTaskInput, UpdateTaskInput } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

export default function LifeDashboardView({ userId }: Props) {
  const t = useTranslations("dashboard");
  const { showToast } = useToast();
  const { create: createHabit, update: updateHabit, deactivate: deleteHabit } = useSettingsHabits(userId, { skipInitialFetch: true });

  const [activeTab, setActiveTab] = useState<HomeTab>("focus");
  const [viewDate, setViewDate] = useState(() => new Date());

  const dashboard = useDashboard(userId, viewDate);
  const workoutsHook = useWorkouts(userId);
  const viewDow = dayOfWeek(viewDate);

  const dataError = dashboard.tasksError ?? dashboard.categoriesError;
  const retryData = () => {
    dashboard.retryTasks();
    dashboard.retryCategories();
  };

  // Errores de carga silenciosos (ya reintentados una vez dentro de cada
  // hook): se avisan acá en vez de dejar Board/Kanban vacíos sin explicación.
  useEffect(() => {
    if (dataError) showToast({ message: t("data_error"), actionLabel: t("retry"), onAction: retryData, duration: 5000 });
  }, [dataError]);
  const dayWorkouts = useMemo(
    () => workoutsHook.workouts.filter((w) => w.isActive && w.dayOfWeek.includes(viewDow)),
    [workoutsHook.workouts, viewDow]
  );
  const workoutsCount = dayWorkouts.length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithStatus | null>(null);
  const [dialogStartAtDelete, setDialogStartAtDelete] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null);

  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null);

  const openCreate = (categoryId?: string | null) => {
    setSelectedTask(null);
    setDialogStartAtDelete(false);
    setDefaultCategoryId(categoryId ?? null);
    setDialogOpen(true);
  };

  const openEdit = (task: TaskWithStatus) => {
    setSelectedTask(task);
    setDialogStartAtDelete(false);
    setDefaultCategoryId(null);
    setDialogOpen(true);
  };

  const openDelete = (task: TaskWithStatus) => {
    setSelectedTask(task);
    setDialogStartAtDelete(true);
    setDefaultCategoryId(null);
    setDialogOpen(true);
  };

  const handleInlineCreate = (title: string) => {
    dashboard.createTask({ title });
  };

  // La creación rápida vía el FAB global ahora la maneja GlobalQuickAddDialogs
  // (montado en el layout, escucha quickAddStore) — este componente conserva
  // sus propios TaskFormDialog/HabitFormDialog solo para editar/eliminar.

  if (dashboard.isLoading || workoutsHook.isLoading) return <DashboardSkeleton />;

  return (
    <>
      <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10 flex flex-col gap-4">
        <MotivationalHeader
          date={viewDate}
          onDateChange={setViewDate}
          habitsCount={dashboard.habitsProgress.total}
          tasksCount={dashboard.todayCount}
          workoutsCount={workoutsCount}
        />

        <HomeTabBar active={activeTab} onChange={setActiveTab} />

        {dataError && <DataErrorBanner onRetry={retryData} />}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "focus" && (
              <EnfoqueTab
                userId={userId}
                viewDate={viewDate}
                todayTasks={dashboard.todayTasks}
                habits={dashboard.habits}
                overdue={dashboard.overdue}
                isToday={dashboard.isToday}
                dayWorkouts={dayWorkouts}
                workoutsLoading={workoutsHook.isLoading}
                onToggleWorkout={workoutsHook.toggleWorkoutCompletion}
                onToggleTask={dashboard.toggleTodayTask}
                onToggleOverdueTask={dashboard.toggleTask}
                onEditTask={openEdit}
                onDeleteTask={openDelete}
                onCreateTask={handleInlineCreate}
                onCompleteHabit={dashboard.completeHabit}
                onUncheckHabit={dashboard.uncheckHabit}
                onEditHabit={(id) => {
                  setSelectedHabit(dashboard.habits.find(h => h.id === id) ?? null);
                  setHabitDialogOpen(true);
                }}
              />
            )}

            {activeTab === "board" && (
              <TableroTab
                userId={userId}
                categories={dashboard.categories}
                allPendingTasks={dashboard.allPendingTasks}
                habits={dashboard.habits}
                workouts={dayWorkouts}
                onToggleTask={dashboard.toggleTask}
                onEditTask={openEdit}
                onDeleteTask={openDelete}
                onAddTask={openCreate}
                onCompleteHabit={dashboard.completeHabit}
                onUncheckHabit={dashboard.uncheckHabit}
                onToggleWorkout={dashboard.isToday ? workoutsHook.toggleWorkoutCompletion : () => {}}
              />
            )}

            {activeTab === "kanban" && (
              <KanbanTab
                userId={userId}
                tasks={dashboard.tasks}
                onToggleTask={dashboard.toggleTask}
                onEditTask={openEdit}
                onDeleteTask={openDelete}
                onUpdateStatus={dashboard.updateTaskStatus}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setDialogStartAtDelete(false); setDefaultCategoryId(null); }}
        task={selectedTask}
        userId={userId}
        defaultConfirmDelete={dialogStartAtDelete}
        onCreate={async (input: CreateTaskInput) => {
          const finalInput = defaultCategoryId && !input.categoryId
            ? { ...input, categoryId: defaultCategoryId }
            : input;
          await dashboard.createTask(finalInput);
        }}
        onUpdate={async (task, input: UpdateTaskInput) => { await dashboard.updateTask(task, input); }}
        onDelete={async (id) => { await dashboard.deleteTask(id); }}
      />

      <HabitFormDialog
        open={habitDialogOpen}
        onClose={() => { setHabitDialogOpen(false); setSelectedHabit(null); }}
        habit={selectedHabit}
        categories={dashboard.categories}
        onSave={async (data) => {
          if (selectedHabit) {
            await updateHabit(selectedHabit.id, data as UpdateHabitInput);
          } else {
            await createHabit(data as CreateHabitInput);
          }
          setHabitDialogOpen(false);
          setSelectedHabit(null);
        }}
        onDelete={selectedHabit ? async () => {
          await deleteHabit(selectedHabit.id);
          setHabitDialogOpen(false);
          setSelectedHabit(null);
        } : undefined}
      />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
      <div className="h-7 w-48 rounded-lg mb-6 skeleton-shimmer" style={{ background: "var(--surface)" }} />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-[300px] flex-shrink-0 flex flex-col gap-2">
            <div className="h-5 w-24 rounded-lg skeleton-shimmer" style={{ background: "var(--surface)" }} />
            <div className="h-14 rounded-lg skeleton-shimmer" style={{ background: "var(--surface)" }} />
            <div className="h-14 rounded-lg skeleton-shimmer" style={{ background: "var(--surface)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
