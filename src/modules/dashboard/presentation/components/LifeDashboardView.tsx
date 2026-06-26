"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import { MotivationalHeader } from "./MotivationalHeader";
import { HomeTabBar, type HomeTab } from "./HomeTabBar";
import { EnfoqueTab } from "./EnfoqueTab";
import { TableroTab } from "./TableroTab";
import { EisenhowerTab } from "./EisenhowerTab";
import { KanbanTab } from "./KanbanTab";
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
  const dashboard = useDashboard(userId);

  const [activeTab, setActiveTab] = useState<HomeTab>("focus");
  const [viewDate, setViewDate] = useState(() => new Date());

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

  const handleInlineCreate = (title: string) => {
    dashboard.createTask({ title });
  };

  if (dashboard.isLoading) return <DashboardSkeleton />;

  const activeFocus = dashboard.focusMode.active;

  return (
    <>
      <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10 flex flex-col gap-4">
        <MotivationalHeader
          date={viewDate}
          onDateChange={setViewDate}
          habitsCount={dashboard.habitsProgress.total}
          tasksCount={dashboard.todayTasks.length}
        />

        <HomeTabBar active={activeTab} onChange={setActiveTab} />

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
                todayTasks={dashboard.todayTasks}
                habits={dashboard.habits}
                overdue={dashboard.overdue}
                onToggleTask={dashboard.toggleTask}
                onEditTask={openEdit}
                onDeleteTask={openDelete}
                onCreateTask={handleInlineCreate}
                onCompleteHabit={dashboard.completeHabit}
                onUncheckHabit={dashboard.uncheckHabit}
              />
            )}

            {activeTab === "board" && (
              <TableroTab
                categories={dashboard.categories}
                tasksByCategory={dashboard.tasksByCategory}
                uncategorized={dashboard.uncategorized}
                overdue={dashboard.overdue}
                habits={dashboard.habits}
                onToggleTask={dashboard.toggleTask}
                onEditTask={openEdit}
                onDeleteTask={openDelete}
                onAddTask={openCreate}
                onCompleteHabit={dashboard.completeHabit}
                onUncheckHabit={dashboard.uncheckHabit}
              />
            )}

            {activeTab === "eisenhower" && (
              <EisenhowerTab
                tasks={dashboard.tasks}
                onToggleTask={dashboard.toggleTask}
                onEditTask={openEdit}
                onDeleteTask={openDelete}
              />
            )}

            {activeTab === "kanban" && (
              <KanbanTab
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

      {/* Floating action buttons — bottom right */}
      <div className="fixed z-30 right-5 bottom-[calc(env(safe-area-inset-bottom)+96px)] lg:right-8 lg:bottom-8 flex flex-col gap-3 items-center">
        {!activeFocus && <FocusModeButton onClick={() => setFocusPickerOpen(true)} />}
        <button
          type="button"
          onClick={() => openCreate()}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
            boxShadow: "0 4px 16px -4px rgba(0,0,0,0.5)",
          }}
        >
          <Plus size={22} strokeWidth={2} />
        </button>
      </div>

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
