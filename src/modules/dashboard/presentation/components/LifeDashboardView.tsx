"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useDashboard } from "../hooks/useDashboard";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardTimeline } from "./DashboardTimeline";
import { DashboardOverdueColumn } from "./DashboardOverdueColumn";
import { DashboardHabitsColumn } from "./DashboardHabitsColumn";
import { DashboardTasksColumn } from "./DashboardTasksColumn";
import { DashboardColumn } from "./DashboardColumn";
import { TaskCardDashboard } from "./TaskCardDashboard";
import { TaskFormDialog } from "@/modules/tasks/presentation/components/TaskFormDialog";
import { FocusModeButton } from "@/modules/tasks/presentation/components/FocusModeButton";
import { FocusModeTaskPickerDialog } from "@/modules/tasks/presentation/components/FocusModeTaskPickerDialog";
import { FocusModeOverlay } from "@/modules/tasks/presentation/components/FocusModeOverlay";
import type { TaskWithStatus, CreateTaskInput, UpdateTaskInput } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

export default function LifeDashboardView({ userId }: Props) {
  const t = useTranslations("dashboard");
  const dashboard = useDashboard(userId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithStatus | null>(null);
  const [dialogStartAtDelete, setDialogStartAtDelete] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null);

  const [focusPickerOpen, setFocusPickerOpen] = useState(false);
  const [focusOverlayOpen, setFocusOverlayOpen] = useState(false);

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

  if (dashboard.isLoading) return <DashboardSkeleton />;

  const activeFocus = dashboard.focusMode.active;

  return (
    <>
      <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10 flex flex-col gap-6">
        {/* Header */}
        <DashboardHeader
          habitsProgress={dashboard.habitsProgress}
          focusSession={activeFocus}
          onOpenFocusOverlay={() => setFocusOverlayOpen(true)}
          onNewTask={() => openCreate()}
        />

        {/* Timeline */}
        <DashboardTimeline
          tasks={dashboard.todayTasks}
          habits={dashboard.habits}
        />

        {/* Columns */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-4 lg:overflow-x-auto lg:pb-4 lg:-mx-2 lg:px-2">
          {/* Overdue */}
          <DashboardOverdueColumn
            tasks={dashboard.overdue}
            onToggle={dashboard.toggleTask}
            onEdit={openEdit}
            onDelete={openDelete}
          />

          {/* Habits */}
          <DashboardHabitsColumn
            habits={dashboard.habits}
            onComplete={dashboard.completeHabit}
            onUncheck={dashboard.uncheckHabit}
          />

          {/* Category columns */}
          {dashboard.categories.map((cat) => (
            <DashboardTasksColumn
              key={cat.id}
              category={cat}
              tasks={dashboard.tasksByCategory[cat.id] ?? []}
              onToggle={dashboard.toggleTask}
              onEdit={openEdit}
              onDelete={openDelete}
              onAdd={() => openCreate(cat.id)}
            />
          ))}

          {/* Uncategorized */}
          {dashboard.uncategorized.length > 0 && (
            <DashboardColumn
              title={t("uncategorized")}
              count={dashboard.uncategorized.length}
              collapsible
              defaultCollapsed
              onAdd={() => openCreate()}
            >
              {dashboard.uncategorized.map((task) => (
                <TaskCardDashboard
                  key={task.id}
                  task={task}
                  onToggle={() => dashboard.toggleTask(task)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => openDelete(task)}
                />
              ))}
            </DashboardColumn>
          )}
        </div>
      </div>

      {/* Task Form Dialog */}
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

      {/* Focus Mode */}
      {!activeFocus && <FocusModeButton onClick={() => setFocusPickerOpen(true)} />}

      <FocusModeTaskPickerDialog
        open={focusPickerOpen}
        onClose={() => setFocusPickerOpen(false)}
        userId={userId}
        onStart={(taskIds) => { dashboard.focusMode.start(taskIds); }}
      />

      <AnimatePresence>
        {(activeFocus && focusOverlayOpen) && (
          <FocusModeOverlay
            key="focus-overlay"
            session={activeFocus}
            tasks={dashboard.todayTasks.filter((tk) => activeFocus.taskIds.includes(tk.id))}
            toggleTask={dashboard.toggleTodayTask}
            onPause={dashboard.focusMode.pause}
            onResume={dashboard.focusMode.resume}
            onSkip={dashboard.focusMode.advancePhase}
            onClose={() => setFocusOverlayOpen(false)}
            onUpdateConfig={dashboard.focusMode.updateActiveConfig}
            onReset={dashboard.focusMode.resetTimer}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
      <div className="h-7 w-48 rounded-lg mb-6 animate-pulse" style={{ background: "var(--surface)" }} />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-[300px] flex-shrink-0 flex flex-col gap-2">
            <div className="h-5 w-24 rounded-lg animate-pulse" style={{ background: "var(--surface)" }} />
            <div className="h-14 rounded-[14px] animate-pulse" style={{ background: "var(--surface)" }} />
            <div className="h-14 rounded-[14px] animate-pulse" style={{ background: "var(--surface)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
