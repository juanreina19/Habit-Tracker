"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useTasks } from "../hooks/useTasks";
import { useTodayTasks } from "../hooks/useTodayTasks";
import { TaskCard } from "./TaskCard";
import { TaskEmptyState } from "./TaskEmptyState";
import { TaskFormDialog } from "./TaskFormDialog";
import { WeekTab } from "./WeekTab";
import { isTaskDone, isRecurring } from "../../domain/entities/Task";
import type { TaskWithStatus, TaskPriority, CreateTaskInput, UpdateTaskInput } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

function getGroup(task: TaskWithStatus, todayStr: string): number {
  if (!task.dueDate) return 3;
  if (task.dueDate < todayStr) return 0;
  if (task.dueDate === todayStr) return 1;
  return 2;
}

function sortPending(tasks: TaskWithStatus[]): TaskWithStatus[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  return [...tasks].sort((a, b) => {
    const ga = getGroup(a, todayStr);
    const gb = getGroup(b, todayStr);
    if (ga !== gb) return ga - gb;
    return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
  });
}

function sortByPriority(tasks: TaskWithStatus[]): TaskWithStatus[] {
  return [...tasks].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
}

type Tab = "today" | "week" | "all";
const TABS: Tab[] = ["today", "week", "all"];

interface Props {
  userId: UUID;
}

export default function TasksView({ userId }: Props) {
  const t = useTranslations("tasks");
  const { tasks, isLoading, createTask, updateTask, toggleTask, deleteTask } = useTasks(userId);

  const [tab, setTab] = useState<Tab>("today");
  const [dialogOpen, setDialogOpen]               = useState(false);
  const [selectedTask, setSelectedTask]           = useState<TaskWithStatus | null>(null);
  const [dialogStartAtDelete, setDialogStartAtDelete] = useState(false);

  const openCreate = () => {
    setSelectedTask(null);
    setDialogStartAtDelete(false);
    setDialogOpen(true);
  };

  const openEdit = (task: TaskWithStatus) => {
    setSelectedTask(task);
    setDialogStartAtDelete(false);
    setDialogOpen(true);
  };

  const openDelete = (task: TaskWithStatus) => {
    setSelectedTask(task);
    setDialogStartAtDelete(true);
    setDialogOpen(true);
  };

  if (isLoading) return <TasksSkeleton />;

  return (
    <>
      <div
        className={`px-5 pt-14 pb-6 mx-auto lg:pt-8 lg:px-10 ${tab === "week" ? "max-w-lg lg:max-w-7xl" : "max-w-lg lg:max-w-3xl"}`}
      >
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {t("title")}
            </h1>
          </div>
          <button
            onClick={openCreate}
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            aria-label={t("new_task")}
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
          <button
            onClick={openCreate}
            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full transition-opacity active:opacity-70"
            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span className="text-sm font-semibold">{t("new_task")}</span>
          </button>
        </div>

        {/* Segmented control — Hoy / Semana / Todas */}
        <div className="flex rounded-[12px] p-1 mb-6" style={{ background: "var(--surface)" }}>
          {TABS.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className="flex-1 px-4 py-2 rounded-[9px] text-sm font-medium transition-all"
              style={{
                background: tab === tabKey ? "var(--surface-elevated)" : "transparent",
                color: tab === tabKey ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {t(`tab_${tabKey}`)}
            </button>
          ))}
        </div>

        {tab === "today" && <TodayTab userId={userId} onEdit={openEdit} onDelete={openDelete} />}
        {tab === "week" && <WeekTab userId={userId} tasks={tasks} />}
        {tab === "all" && (
          <AllTab tasks={tasks} toggleTask={toggleTask} onEdit={openEdit} onDelete={openDelete} />
        )}
      </div>

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setDialogStartAtDelete(false); }}
        task={selectedTask}
        defaultConfirmDelete={dialogStartAtDelete}
        onCreate={async (input: CreateTaskInput) => { await createTask(input); }}
        onUpdate={async (task, input: UpdateTaskInput) => { await updateTask(task, input); }}
        onDelete={async (id) => { await deleteTask(id); }}
      />
    </>
  );
}

// ─── Tab: Hoy (interactiva) ───────────────────────────────────────────────────
// Reutiliza useTodayTasks (findForToday) — mismo layout exacto que la vista anterior,
// sin ningún cambio visual: Pendientes + Completadas colapsable + TaskCard completo.

interface TodayTabProps {
  userId: UUID;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
}

function TodayTab({ userId, onEdit, onDelete }: TodayTabProps) {
  const t = useTranslations("tasks");
  const { tasks, toggleTask } = useTodayTasks(userId);
  const [showDone, setShowDone] = useState(true);

  const pending = sortPending(tasks.filter((tk) => !isTaskDone(tk)));
  const done    = tasks.filter((tk) => isTaskDone(tk));

  return (
    <>
      <TaskSection
        title={`${t("pending")} (${pending.length})`}
        tasks={pending}
        toggleTask={toggleTask}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyState={<TaskEmptyState />}
      />
      <CollapsibleTaskSection
        title={`${t("completed")} (${done.length})`}
        tasks={done}
        toggleTask={toggleTask}
        onEdit={onEdit}
        onDelete={onDelete}
        show={showDone}
        onToggleShow={() => setShowDone((p) => !p)}
      />
    </>
  );
}

// ─── Tab: Todas (administrativa) ──────────────────────────────────────────────
// Vista actual evolucionada: secciones Atrasadas / Pendientes / Completadas
// + filtros por prioridad y tipo (única / recurrente). Edición nunca bloqueada.

interface AllTabProps {
  tasks: TaskWithStatus[];
  toggleTask: (task: TaskWithStatus) => void;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
}

type TypeFilter = "all" | "once" | "recurring";

function AllTab({ tasks, toggleTask, onEdit, onDelete }: AllTabProps) {
  const t = useTranslations("tasks");
  const [showDone, setShowDone]           = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [typeFilter, setTypeFilter]        = useState<TypeFilter>("all");

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const filtered = tasks.filter((tk) => {
    if (priorityFilter !== "all" && tk.priority !== priorityFilter) return false;
    if (typeFilter === "once" && isRecurring(tk)) return false;
    if (typeFilter === "recurring" && !isRecurring(tk)) return false;
    return true;
  });

  const pendingAll = filtered.filter((tk) => !isTaskDone(tk));
  const overdue = sortByPriority(pendingAll.filter((tk) => tk.dueDate && tk.dueDate < todayStr));
  const pending = sortPending(pendingAll.filter((tk) => !(tk.dueDate && tk.dueDate < todayStr)));
  const done    = filtered.filter((tk) => isTaskDone(tk));

  return (
    <>
      {/* Filtros */}
      <div className="flex flex-col gap-2 mb-5">
        <FilterRow
          label={t("filter_priority")}
          options={[
            { value: "all", label: t("filter_all") },
            ...PRIORITIES.map((p) => ({ value: p, label: t(`priority_${p}`) })),
          ]}
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as TaskPriority | "all")}
        />
        <FilterRow
          label={t("filter_type")}
          options={[
            { value: "all", label: t("filter_all") },
            { value: "once", label: t("filter_type_once") },
            { value: "recurring", label: t("filter_type_recurring") },
          ]}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
        />
      </div>

      {overdue.length > 0 && (
        <TaskSection
          title={`${t("overdue_section")} (${overdue.length})`}
          tasks={overdue}
          toggleTask={toggleTask}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

      <TaskSection
        title={`${t("pending")} (${pending.length})`}
        tasks={pending}
        toggleTask={toggleTask}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyState={<TaskEmptyState />}
      />

      <CollapsibleTaskSection
        title={`${t("completed")} (${done.length})`}
        tasks={done}
        toggleTask={toggleTask}
        onEdit={onEdit}
        onDelete={onDelete}
        show={showDone}
        onToggleShow={() => setShowDone((p) => !p)}
      />
    </>
  );
}

// ─── Filtro tipo chip ─────────────────────────────────────────────────────────

interface FilterRowProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

function FilterRow({ label, options, value, onChange }: FilterRowProps) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: value === opt.value ? "var(--btn-primary-bg)" : "var(--surface)",
              color: value === opt.value ? "var(--btn-primary-text)" : "var(--text-secondary)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Secciones de lista compartidas (Pendientes / Atrasadas / Completadas) ────
// Extracción 1:1 del JSX original — usada por TodayTab y AllTab para no duplicar
// la estructura visual ya validada (evita drift entre copias).

interface TaskSectionProps {
  title: string;
  tasks: TaskWithStatus[];
  toggleTask: (task: TaskWithStatus) => void;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
  emptyState?: React.ReactNode;
}

function TaskSection({ title, tasks, toggleTask, onEdit, onDelete, emptyState }: TaskSectionProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {title}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
      </div>

      {tasks.length === 0 && emptyState ? emptyState : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task)}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface CollapsibleTaskSectionProps {
  title: string;
  tasks: TaskWithStatus[];
  toggleTask: (task: TaskWithStatus) => void;
  onEdit: (task: TaskWithStatus) => void;
  onDelete: (task: TaskWithStatus) => void;
  show: boolean;
  onToggleShow: () => void;
}

function CollapsibleTaskSection({ title, tasks, toggleTask, onEdit, onDelete, show, onToggleShow }: CollapsibleTaskSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="mt-6">
      <button onClick={onToggleShow} className="flex items-center gap-2 mb-3 w-full text-left">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {title}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
        {show
          ? <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />
          : <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />}
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pb-1">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task)}
                  onEdit={() => onEdit(task)}
                  onDelete={() => onDelete(task)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      <div className="h-7 w-24 rounded-lg mb-8 animate-pulse" style={{ background: "var(--surface)" }} />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-[16px] animate-pulse" style={{ background: "var(--surface)" }} />
        ))}
      </div>
    </div>
  );
}
