"use client";

import { useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";
import { today } from "@/shared/lib/utils/dates";
import { isTaskDone } from "../../domain/entities/Task";
import type { Task, TaskPriority } from "../../domain/entities/Task";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  medium: "#eab308",
  low:    "#6b7280",
};

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
    label = t("overdue");
    color = "#ef4444";
  } else if (dueDate === todayStr) {
    label = t("today");
    color = "var(--accent)";
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

interface Props {
  task: Task;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

const SWIPE_THRESHOLD = 60;

export function TaskCard({ task, onToggle, onEdit, onDelete, compact = false }: Props) {
  const t = useTranslations("tasks");
  const done = isTaskDone(task);
  const priorityColor = PRIORITY_COLORS[task.priority];
  const showMenu = !compact && (onEdit || onDelete);

  // Swipe via useMotionValue — only x, zero interference with y
  const x = useMotionValue(0);
  const startX = useRef(0);
  const didSwipe = useRef(false);

  const handlePointerDown = !compact
    ? (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        startX.current = e.clientX;
        didSwipe.current = false;
      }
    : undefined;

  const handlePointerMove = !compact
    ? (e: React.PointerEvent<HTMLDivElement>) => {
        const dx = e.clientX - startX.current;
        if (dx > 4) {
          didSwipe.current = true;
          x.set(dx);
        }
      }
    : undefined;

  const handlePointerUp = !compact
    ? () => {
        if (x.get() >= SWIPE_THRESHOLD) onToggle();
        animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
        didSwipe.current = false;
      }
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="flex items-center gap-4 rounded-[16px] p-4 select-none"
      style={{
        x,
        background: "var(--surface)",
        opacity: done ? 0.65 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={done ? t("mark_pending") : t("mark_done")}
        className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: done ? priorityColor : "var(--border)",
          background:  done ? priorityColor : "transparent",
        }}
      >
        {done && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            width="12" height="12" viewBox="0 0 12 12" fill="none"
          >
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </button>

      {/* Content */}
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
        {!compact && task.dueDate && (
          <div className="mt-1">
            <DueDate dueDate={task.dueDate} done={done} />
          </div>
        )}
      </div>

      {/* Three-dots menu */}
      {showMenu && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
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
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
              }}
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
    </motion.div>
  );
}
