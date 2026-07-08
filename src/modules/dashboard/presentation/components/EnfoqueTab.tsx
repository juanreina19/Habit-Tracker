"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ClipboardPen, Repeat, Filter, Pencil, Check, GripVertical } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { InlineTaskInput } from "./InlineTaskInput";
import { TaskCardDashboard } from "./TaskCardDashboard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { Confetti } from "@/shared/components/ui/Confetti";
import { isTaskDone, formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { today as getToday, isTimePast } from "@/shared/lib/utils/dates";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { HabitWithStatus } from "@/modules/habits/domain/entities/Habit";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  viewDate?: Date;
  todayTasks: TaskWithStatus[];
  habits: HabitWithStatus[];
  overdue: TaskWithStatus[];
  isToday?: boolean;
  onToggleTask: (task: TaskWithStatus) => void;
  onToggleOverdueTask?: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
  onCreateTask: (title: string) => void;
  onCompleteHabit: (habitId: string) => void;
  onUncheckHabit: (habitId: string) => void;
  onEditHabit?: (habitId: string) => void;
}

interface AgendaItem {
  type: "task" | "habit";
  id: string;
  time: string | null;
  rawTime: string | null;
  completed: boolean;
  task?: TaskWithStatus;
  habit?: HabitWithStatus;
}

export function EnfoqueTab({
  userId, viewDate, todayTasks, habits, overdue, isToday = true,
  onToggleTask, onToggleOverdueTask, onEditTask, onDeleteTask, onCreateTask,
  onCompleteHabit, onUncheckHabit, onEditHabit,
}: Props) {
  const toggleOverdue = onToggleOverdueTask ?? onToggleTask;
  const t = useTranslations("dashboard");
  const [urgencyFilter, setUrgencyFilter] = useState(false);
  const [timeFilter, setTimeFilter] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"task" | "habit" | null>(null);
  const anyFilterActive = urgencyFilter || timeFilter || typeFilter !== null;

  const guardedToggleTask    = isToday ? onToggleTask    : () => {};
  const guardedToggleOverdue = isToday ? toggleOverdue   : () => {};
  const guardedCompleteHabit = isToday ? onCompleteHabit : () => {};
  const guardedUncheckHabit  = isToday ? onUncheckHabit  : () => {};

  const storageKey = useMemo(
    () => `agenda-order-${userId}-${format(viewDate ?? new Date(), "yyyy-MM-dd")}`,
    [userId, viewDate],
  );

  const todayNonOverdue = useMemo(
    () => todayTasks.filter((tk) => !(tk.dueDate && tk.dueDate < getToday())),
    [todayTasks],
  );

  const { timedItems, untimedItems } = useMemo<{ timedItems: AgendaItem[]; untimedItems: AgendaItem[] }>(() => {
    const items: AgendaItem[] = [];

    for (const task of todayNonOverdue) {
      if (urgencyFilter && task.priority !== "urgent" && task.priority !== "high") continue;
      if (timeFilter && !task.startTime) continue;
      if (typeFilter === "habit") continue;
      items.push({
        type: "task",
        id: task.id,
        time: task.startTime ? formatTaskTime(task.startTime) : null,
        rawTime: task.startTime?.slice(0, 5) ?? null,
        completed: isTaskDone(task),
        task,
      });
    }

    for (const habit of habits) {
      if (timeFilter && !habit.startTime) continue;
      if (typeFilter === "task") continue;
      items.push({
        type: "habit",
        id: habit.id,
        time: habit.startTime ? formatTaskTime(habit.startTime) : null,
        rawTime: habit.startTime?.slice(0, 5) ?? null,
        completed: habit.isCompletedToday,
        habit,
      });
    }

    const sorted = items.sort((a, b) => {
      if (a.rawTime && !b.rawTime) return -1;
      if (!a.rawTime && b.rawTime) return 1;
      if (a.rawTime && b.rawTime) return a.rawTime.localeCompare(b.rawTime);
      return 0;
    });

    return {
      timedItems: sorted.filter(i => i.rawTime !== null),
      untimedItems: sorted.filter(i => i.rawTime === null),
    };
  }, [todayNonOverdue, habits, urgencyFilter, timeFilter, typeFilter]);

  const sortedOverdue = useMemo(
    () => [...overdue].sort((a, b) => {
      const aDone = isTaskDone(a);
      const bDone = isTaskDone(b);
      return aDone === bDone ? 0 : aDone ? 1 : -1;
    }),
    [overdue]
  );

  const [orderedItems, setOrderedItems] = useState<AgendaItem[]>(() => {
    const allItems = [...timedItems, ...untimedItems];
    const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (!stored) return allItems;
    const ids: string[] = JSON.parse(stored);
    const map = new Map(allItems.map(i => [i.id, i]));
    const ordered = ids.map(id => map.get(id)).filter(Boolean) as AgendaItem[];
    const newOnes = allItems.filter(i => !ids.includes(i.id));
    return [...ordered, ...newOnes];
  });

  useEffect(() => {
    setOrderedItems(prev => {
      const allItems = [...timedItems, ...untimedItems];
      const existingIds = new Set(prev.map(i => i.id));
      const map = new Map(allItems.map(i => [i.id, i]));
      const updated = prev.map(i => map.get(i.id)).filter(Boolean) as AgendaItem[];
      const newOnes = allItems.filter(i => !existingIds.has(i.id));
      return [...updated, ...newOnes];
    });
  }, [timedItems, untimedItems]);

  const handleReorder = (next: AgendaItem[]) => {
    setOrderedItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next.map(i => i.id)));
  };

  const allDone = useMemo(
    () => orderedItems.length > 0 && orderedItems.every(i => i.completed),
    [orderedItems],
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const prevAllDone = useRef(false);
  useEffect(() => {
    if (!prevAllDone.current && allDone) setShowConfetti(true);
    prevAllDone.current = allDone;
  }, [allDone]);

  return (
    <>
    {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
      {/* Agenda with timeline */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionHeader label={t("agenda").toUpperCase()} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
                style={{
                  background: anyFilterActive ? "var(--text-primary)" : "var(--surface-elevated)",
                  color: anyFilterActive ? "var(--bg)" : "var(--text-muted)",
                }}
              >
                <Filter size={10} strokeWidth={1.5} />
                {t("filter_label")}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 rounded-lg py-1.5 shadow-lg min-w-[170px]"
                style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              >
                <DropdownMenu.CheckboxItem
                  checked={urgencyFilter}
                  onCheckedChange={setUrgencyFilter}
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs cursor-pointer outline-none data-[highlighted]:opacity-70"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("filter_urgent")}
                  {urgencyFilter && <Check size={10} strokeWidth={2} />}
                </DropdownMenu.CheckboxItem>
                <DropdownMenu.CheckboxItem
                  checked={timeFilter}
                  onCheckedChange={setTimeFilter}
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs cursor-pointer outline-none data-[highlighted]:opacity-70"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("filter_timed")}
                  {timeFilter && <Check size={10} strokeWidth={2} />}
                </DropdownMenu.CheckboxItem>
                {/* Divider — indented, not full width */}
                <div className="my-1.5 mx-3 h-px" style={{ background: "var(--border)" }} />
                <DropdownMenu.CheckboxItem
                  checked={typeFilter === "habit"}
                  onCheckedChange={(checked) => setTypeFilter(checked ? "habit" : null)}
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs cursor-pointer outline-none data-[highlighted]:opacity-70"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("type_habit")}
                  {typeFilter === "habit" && <Check size={10} strokeWidth={2} />}
                </DropdownMenu.CheckboxItem>
                <DropdownMenu.CheckboxItem
                  checked={typeFilter === "task"}
                  onCheckedChange={(checked) => setTypeFilter(checked ? "task" : null)}
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs cursor-pointer outline-none data-[highlighted]:opacity-70"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("type_task")}
                  {typeFilter === "task" && <Check size={10} strokeWidth={2} />}
                </DropdownMenu.CheckboxItem>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        {isToday && <InlineTaskInput onCreateTask={onCreateTask} />}

        {/* Timeline */}
        <div className="flex flex-col relative">
          {/* Continuous vertical line */}
          {orderedItems.length > 1 && (
            <div
              className="absolute w-px"
              style={{
                background: "var(--border)",
                left: "calc(3.5rem + 0.75rem)",
                top: 0,
                bottom: 0,
              }}
            />
          )}

          {/* All items — timed and untimed — unified reorderable list */}
          <Reorder.Group as="div" axis="y" values={orderedItems} onReorder={handleReorder}>
            {orderedItems.map((item) => (
              <AgendaReorderItem
                key={item.id}
                item={item}
                userId={userId}
                typeTaskLabel={t("type_task")}
                onToggleTask={guardedToggleTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onCompleteHabit={guardedCompleteHabit}
                onUncheckHabit={guardedUncheckHabit}
                onEditHabit={onEditHabit}
              />
            ))}
          </Reorder.Group>

          {orderedItems.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>—</p>
          )}
        </div>
      </div>

      {/* Overdue / Vencidas — timeline without time, just line + icons */}
      <div className="flex flex-col gap-3">
        <SectionHeader label={t("overdue").toUpperCase()} />
        <div className="flex flex-col relative">
          {/* Continuous vertical line */}
          {sortedOverdue.length > 1 && (
            <div
              className="absolute w-px"
              style={{
                background: "var(--border)",
                left: "0.75rem",
                top: 0,
                bottom: 0,
              }}
            />
          )}
          <AnimatePresence initial={false}>
            {sortedOverdue.map((task) => {
              const done = isTaskDone(task);
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center"
                >
                  {/* Node */}
                  <div className="w-6 flex-shrink-0 flex items-center justify-center relative z-10">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: done ? "var(--accent)" : "var(--bg)",
                        border: done ? "2px solid var(--accent)" : "1px solid var(--border)",
                      }}
                    >
                      <ClipboardPen size={10} strokeWidth={1.5} style={{ color: done ? "#FFFFFF" : "var(--text-muted)" }} />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0 py-1 pl-2">
                    <TaskCardDashboard
                      task={task}
                      userId={userId}
                      onToggle={() => guardedToggleOverdue(task)}
                      onEdit={() => onEditTask(task)}
                      onDelete={() => onDeleteTask(task)}
                      overdue
                      showDescription
                      showDueDate
                      typeLabel={t("type_task")}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {sortedOverdue.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>—</p>
          )}
        </div>
      </div>
    </div>
    </>
  );
}


// ─── Shared agenda item sub-components ──────────────────────────────────────

function AgendaNode({ item }: { item: AgendaItem }) {
  return (
    <div className="w-6 flex-shrink-0 flex items-center justify-center relative z-10">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: item.completed ? "var(--accent)" : "var(--bg)",
          border: item.completed ? "2px solid var(--accent)" : "1px solid var(--border)",
        }}
      >
        {item.type === "habit"
          ? <Repeat size={11} strokeWidth={1.5} style={{ color: item.completed ? "#FFFFFF" : "var(--text-muted)" }} />
          : <ClipboardPen size={11} strokeWidth={1.5} style={{ color: item.completed ? "#FFFFFF" : "var(--text-muted)" }} />
        }
      </div>
    </div>
  );
}

interface AgendaCardProps {
  item: AgendaItem;
  userId: UUID;
  typeTaskLabel: string;
  onToggleTask: (task: TaskWithStatus) => void;
  onEditTask: (task: TaskWithStatus) => void;
  onDeleteTask: (task: TaskWithStatus) => void;
  onCompleteHabit: (habitId: string) => void;
  onUncheckHabit: (habitId: string) => void;
  onEditHabit?: (habitId: string) => void;
}

function AgendaCard({ item, userId, typeTaskLabel, onToggleTask, onEditTask, onDeleteTask, onCompleteHabit, onUncheckHabit, onEditHabit }: AgendaCardProps) {
  if (item.type === "task" && item.task) {
    return (
      <TaskCardDashboard
        task={item.task}
        userId={userId}
        onToggle={() => onToggleTask(item.task!)}
        onEdit={() => onEditTask(item.task!)}
        onDelete={() => onDeleteTask(item.task!)}
        showDescription
        typeLabel={typeTaskLabel}
      />
    );
  }
  if (item.type === "habit" && item.habit) {
    return (
      <HabitAgendaRow
        habit={item.habit}
        onToggle={() => {
          if (item.habit!.isCompletedToday) onUncheckHabit(item.habit!.id);
          else onCompleteHabit(item.habit!.id);
        }}
        onEdit={onEditHabit ? () => onEditHabit(item.habit!.id) : undefined}
      />
    );
  }
  return null;
}

/**
 * En puntero fino (mouse) toda la fila sigue siendo zona de drag, como hoy.
 * En puntero grueso (touch) el drag solo se activa desde un handle dedicado
 * — de lo contrario cualquier tap/scroll sobre la card se interpreta como
 * inicio de drag. No se promueve a un hook compartido: un solo consumidor
 * hoy (esta función).
 */
function useIsCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsCoarse(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsCoarse(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isCoarse;
}

/**
 * Drag vía framer-motion (Reorder), mismo mecanismo que HabitReorderItem en
 * HabitsView.tsx — no dnd-kit. dnd-kit's PointerSensor solo captura el touch
 * después de superar la `distance` del activationConstraint, y mientras
 * decide, el navegador puede disparar su propio gesto de "mantener presionado"
 * (selección de texto / menú copiar-pegar) antes de que el drag empiece: se
 * siente como que hay que "sostener" la card. dragControls.start(e) captura
 * el puntero de inmediato en el pointerdown del handle, sin esa espera.
 */
function AgendaReorderItem({ item, ...cardProps }: AgendaCardProps) {
  const dragControls = useDragControls();
  const isCoarsePointer = useIsCoarsePointer();
  const timeParts = item.time?.split(" ") ?? [];
  return (
    <Reorder.Item
      as="div"
      value={item}
      dragControls={dragControls}
      dragListener={!isCoarsePointer}
      className={`flex items-center ${isCoarsePointer ? "" : "touch-none cursor-grab active:cursor-grabbing"}`}
    >
      <div className="w-14 flex-shrink-0 text-right pr-3">
        {timeParts[0] && (
          <>
            <span className="text-[11px] tabular-nums font-normal leading-none block" style={{ color: "var(--text-muted)" }}>{timeParts[0]}</span>
            {timeParts[1] && <span className="text-[9px] font-normal leading-none block mt-px" style={{ color: "var(--text-muted)" }}>{timeParts[1]}</span>}
          </>
        )}
      </div>
      <AgendaNode item={item} />
      <div className="flex-1 min-w-0 py-1 pl-2">
        <AgendaCard item={item} {...cardProps} />
      </div>
      {isCoarsePointer && (
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-2 -mr-1"
          style={{ color: "var(--text-muted)" }}
          aria-label="Reordenar"
        >
          <GripVertical size={16} strokeWidth={1.5} />
        </button>
      )}
    </Reorder.Item>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function calcHabitEnd(start: string, mins: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function HabitAgendaRow({ habit, onToggle, onEdit }: { habit: HabitWithStatus; onToggle: () => void; onEdit?: () => void }) {
  const t = useTranslations("dashboard");
  const done = habit.isCompletedToday;
  const habitOverdue = !done && !!habit.startTime && !!habit.estimatedMinutes
    && isTimePast(calcHabitEnd(habit.startTime, habit.estimatedMinutes));

  return (
    <div
      className="group w-full rounded-md p-2.5 flex items-center gap-3 card-border-hover"
      style={{
        background: "var(--bg)",
        border: done ? "1px solid transparent" : "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <motion.div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          animate={done ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            background: done ? "var(--accent)" : "transparent",
            border: done ? "2px solid var(--accent)" : "2px solid var(--border)",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}
        >
          <AnimatePresence>
            {done && (
              <motion.svg
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                width="10" height="8" viewBox="0 0 12 10" fill="none"
              >
                <path d="M1 5l3.5 3.5L11 1" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-normal truncate"
            style={{
              color: done ? "var(--text-secondary)" : "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {habit.name}
          </p>
          {!done && (
            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>
              {t("type_habit")}
            </span>
          )}
        </div>
        {habitOverdue && (
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}
          >
            {t("overdue")}
          </span>
        )}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded-sm active:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <Pencil size={12} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
