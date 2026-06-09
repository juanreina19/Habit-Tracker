"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Clock, CalendarDays, MoreVertical, Pencil, Trash2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";
import { today } from "@/shared/lib/utils/dates";
import { isTaskDone, isRecurring, formatTaskTime, isTaskTimeExpired } from "../../domain/entities/Task";
import type { TaskWithStatus, TaskPriority } from "../../domain/entities/Task";
import { PRIORITY_COLORS } from "../constants/taskColors";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "./TaskCheckbox";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
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
    label = t("overdue"); color = "#ef4444";
  } else if (dueDate === todayStr) {
    label = t("today"); color = "var(--accent)";
  } else {
    label = format(parseLocalDate(dueDate), "d MMM", { locale: dateFnsLocale });
    color = "var(--text-secondary)";
  }
  return (
    <span className="flex items-center gap-1" style={{ color }}>
      <Clock size={11} strokeWidth={2} />
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
      <CalendarDays size={11} strokeWidth={2} />
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
      <Clock size={11} strokeWidth={2} />
      <span className="text-xs">{label}</span>
    </span>
  );
}

interface Props {
  task: TaskWithStatus;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function TaskCard({ task, onToggle, onEdit, onDelete, compact = false }: Props) {
  const t = useTranslations("tasks");
  const done = isTaskDone(task);
  const recurring = isRecurring(task);
  const expired = isTaskTimeExpired(task) && !done;   // solo para el badge "Vencida" — informativo, no restrictivo
  const showMenu = !compact && (onEdit || onDelete);

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
      className="flex flex-col gap-2 rounded-[16px] p-4 select-none"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: done ? 0.65 : 1,
        cursor: "default",
        userSelect: "none",
        WebkitUserSelect: "none",
        willChange: "transform",
      }}
    >
      {/* Fila 1 — prioridad */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: "var(--text-secondary)" }}
        />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {t(`priority_${task.priority}` as `priority_${TaskPriority}`)}
        </span>
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
              {task.startTime && !expired && (
                <TimeBadge startTime={task.startTime} endTime={task.endTime} />
              )}
            </div>
          )}
        </div>

        {/* Badge "Vencida" cuando el tiempo ha expirado */}
        {expired && (
          <span
            className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: "#ef444418", color: "#ef4444" }}
          >
            {t("time_expired")}
          </span>
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
              <MoreVertical size={16} strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[148px] rounded-[14px] p-1.5 shadow-xl outline-none"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              align="end"
              sideOffset={4}
            >
              {onEdit && (
                <DropdownMenu.Item
                  className="task-menu-item flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm cursor-pointer outline-none"
                  style={{ color: "var(--text-primary)" }}
                  onSelect={onEdit}
                >
                  <Pencil size={14} strokeWidth={2} />
                  {t("menu_edit")}
                </DropdownMenu.Item>
              )}
              {onEdit && onDelete && (
                <DropdownMenu.Separator className="my-1 h-px" style={{ background: "var(--border)" }} />
              )}
              {onDelete && (
                <DropdownMenu.Item
                  className="task-menu-item flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm cursor-pointer outline-none"
                  style={{ color: "#ef4444" }}
                  onSelect={onDelete}
                >
                  <Trash2 size={14} strokeWidth={2} />
                  {t("menu_delete")}
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
      </div>
    </motion.div>
  );
}
