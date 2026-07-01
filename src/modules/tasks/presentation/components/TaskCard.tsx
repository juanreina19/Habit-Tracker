"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Clock, CalendarDays, ListChecks, MoreVertical, Pencil, Trash2, Star } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";
import { today } from "@/shared/lib/utils/dates";
import { isTaskDone, isRecurring, formatTaskTime, isTaskTimeExpired } from "../../domain/entities/Task";
import type { TaskWithStatus, TaskPriority } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";
import { PRIORITY_COLORS } from "../constants/taskColors";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "./TaskCheckbox";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { useSubtasks } from "../hooks/useSubtasks";
export { PRIORITY_COLORS };

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function DueDate({ dueDate, done }: { dueDate: string; done: boolean }) {
  const t = useTranslations("tasks");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;
  const todayStr = today();
  let label: string;
  let color: string;
  if (dueDate < todayStr && !done) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = format(d, "yyyy-MM-dd");
    label = dueDate === yesterdayStr
      ? t("yesterday")
      : format(parseLocalDate(dueDate), "d MMM", { locale: dateFnsLocale });
    color = "var(--danger)";
  } else if (dueDate === todayStr) {
    label = t("today"); color = "var(--accent)";
  } else {
    label = format(parseLocalDate(dueDate), "d MMM", { locale: dateFnsLocale });
    color = "var(--text-secondary)";
  }
  return (
    <span className="flex items-center gap-1" style={{ color }}>
      <Clock size={11} strokeWidth={1} />
      <span className="text-xs">{label}</span>
    </span>
  );
}

function RecurrenceBadge({ days }: { days: number[] }) {
  const tDays = useTranslations("dayLabels");
  const t = useTranslations("tasks");
  const label = days.length === 7
    ? t("recurrence_daily")
    : days.map(d => tDays(`d${d}` as Parameters<typeof tDays>[0])).join(" ");
  return (
    <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
      <CalendarDays size={11} strokeWidth={1} />
      <span className="text-xs">{label}</span>
    </span>
  );
}

function TimeBadge({ startTime, endTime }: { startTime: string; endTime?: string | null }) {
  const start = formatTaskTime(startTime);
  const end = endTime ? formatTaskTime(endTime) : null;
  const label = end ? `${start} – ${end}` : start;
  return (
    <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
      <Clock size={11} strokeWidth={1} />
      <span className="text-xs">{label}</span>
    </span>
  );
}

function SubtaskBadge({ completed, total, open, onToggle }: {
  completed: number; total: number; open: boolean; onToggle?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={e => e.stopPropagation()}
      onClick={onToggle}
      className="flex items-center gap-1 rounded active:opacity-70"
      style={{ color: open ? "var(--text-primary)" : "var(--text-secondary)" }}
    >
      <ListChecks size={11} strokeWidth={1} />
      <span className="text-xs">{completed}/{total}</span>
    </button>
  );
}

function SubtaskList({ userId, taskId }: { userId: UUID; taskId: UUID }) {
  const { subtasks, isLoading, toggleSubtask } = useSubtasks(userId, taskId);
  if (isLoading) return <div className="py-1 text-xs" style={{ color: "var(--text-muted)" }}>…</div>;
  return (
    <div className="flex flex-col gap-1 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
      {subtasks.map(sub => (
        <button
          key={sub.id}
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); toggleSubtask(sub); }}
          className="flex items-center gap-2 text-left text-xs py-0.5 transition-opacity active:opacity-70"
          style={{ color: sub.isCompleted ? "var(--text-muted)" : "var(--text-primary)" }}
        >
          <span
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 border flex items-center justify-center"
            style={{
              borderColor: sub.isCompleted ? "var(--text-muted)" : "var(--border)",
              background: sub.isCompleted ? "var(--text-muted)" : "transparent",
            }}
          >
            {sub.isCompleted && (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3l2 2 4-4" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ textDecoration: sub.isCompleted ? "line-through" : "none" }}>
            {sub.title}
          </span>
        </button>
      ))}
    </div>
  );
}

interface Props {
  task: TaskWithStatus;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
  userId?: UUID;
}

export function TaskCard({ task, onToggle, onEdit, onDelete, compact = false, userId }: Props) {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const t = useTranslations("tasks");
  const done = isTaskDone(task);
  const recurring = isRecurring(task);
  const expired   = isTaskTimeExpired(task) && !done;
  const isOverdue = !recurring && !!task.dueDate && task.dueDate < today() && !done;
  const isLate    = expired || isOverdue;
  const showMenu  = !compact && (onEdit || onDelete);

  return (
    <motion.div
      layout="position"
      drag={!compact ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.05, right: 0.3 }}
      dragSnapToOrigin
      onDragEnd={!compact ? (_, info) => {
        if (info.offset.x > 60 && Math.abs(info.velocity.x) > 0) onToggle();
      } : undefined}
      whileTap={!compact ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="group flex flex-col gap-2 rounded-lg p-3 select-none card-border-hover"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: done ? 0.65 : 1,
        cursor: "default",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Fila 1 — prioridad (izq) + badge de estado (der). Altura fija para que
          la card no crezca cuando aparece el badge "Atrasada". */}
      <div className="flex items-center justify-between gap-2 h-5">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: PRIORITY_COLORS[task.priority] }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            {t(`priority_${task.priority}` as `priority_${TaskPriority}`)}
          </span>
          {task.isImportant && (
            <Star size={12} fill="var(--text-secondary)" stroke="var(--text-secondary)" />
          )}
        </div>
        {isLate && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
          >
            {t("overdue")}
          </span>
        )}
      </div>

      {/* Fila 2 — checkbox + icono + contenido + acciones */}
      <div className="flex items-center gap-4">
        <TaskCheckbox
          done={done}
          size={TASK_CHECKBOX_SIZE.card}
          animated
          onToggle={onToggle}
          ariaLabel={done ? t("mark_pending") : t("mark_done")}
        />

        {task.icon && (
          <span className="flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
            <HabitIcon icon={task.icon} size={18} />
          </span>
        )}

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate leading-snug"
            style={{
              color: done ? "var(--text-secondary)" : "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {task.title}
          </p>

          {!compact && (
            <div className="mt-1 flex items-center gap-2 flex-wrap min-h-4">
              {recurring
                ? <RecurrenceBadge days={task.recurrenceDays!} />
                : task.dueDate && <DueDate dueDate={task.dueDate} done={done} />
              }
              {task.startTime && (
                <TimeBadge startTime={task.startTime} endTime={task.endTime} />
              )}
              {!!task.subtaskTotal && (
                <SubtaskBadge
                  completed={task.subtaskCompleted ?? 0}
                  total={task.subtaskTotal}
                  open={subtasksOpen}
                  onToggle={userId ? (e) => { e.stopPropagation(); setSubtasksOpen(v => !v); } : undefined}
                />
              )}
            </div>
          )}
        </div>

        {/* Hover pencil — edit shortcut */}
        {onEdit && !compact && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded-sm active:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <Pencil size={12} strokeWidth={1} />
          </button>
        )}

      {/* Three-dots menu */}
      {showMenu && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label="Opciones"
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors active:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              <MoreVertical size={16} strokeWidth={1} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[148px] rounded-lg p-1.5 shadow-xl outline-none"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              align="end"
              sideOffset={4}
            >
              {onEdit && (
                <DropdownMenu.Item
                  className="task-menu-item flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm cursor-pointer outline-none"
                  style={{ color: "var(--text-primary)" }}
                  onSelect={onEdit}
                >
                  <Pencil size={14} strokeWidth={1} />
                  {t("menu_edit")}
                </DropdownMenu.Item>
              )}
              {onEdit && onDelete && (
                <DropdownMenu.Separator className="my-1 h-px" style={{ background: "var(--border)" }} />
              )}
              {onDelete && (
                <DropdownMenu.Item
                  className="task-menu-item flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm cursor-pointer outline-none"
                  style={{ color: "var(--danger)" }}
                  onSelect={onDelete}
                >
                  <Trash2 size={14} strokeWidth={1} />
                  {t("menu_delete")}
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
      </div>

      {subtasksOpen && userId && !!task.subtaskTotal && (
        <SubtaskList userId={userId} taskId={task.id as UUID} />
      )}
    </motion.div>
  );
}
