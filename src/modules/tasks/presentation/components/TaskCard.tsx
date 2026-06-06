"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
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

interface DueDateBadgeProps {
  dueDate: string;
  done: boolean;
}

function DueDateBadge({ dueDate, done }: DueDateBadgeProps) {
  const t = useTranslations("tasks");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;
  const todayStr = today();

  if (done) return null;

  let label: string;
  let color: string;

  if (dueDate < todayStr) {
    label = t("overdue");
    color = "#ef4444";
  } else if (dueDate === todayStr) {
    label = t("today");
    color = "var(--accent, #3b82f6)";
  } else {
    label = format(parseLocalDate(dueDate), "d MMM", { locale: dateFnsLocale });
    color = "var(--text-secondary)";
  }

  return (
    <span className="text-xs" style={{ color }}>
      {label}
    </span>
  );
}

interface Props {
  task: Task;
  onToggle: () => void;
  onClick: () => void;
  compact?: boolean;
}

export function TaskCard({ task, onToggle, onClick, compact = false }: Props) {
  const t = useTranslations("tasks");
  const done = isTaskDone(task);
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer select-none"
      style={{ background: "var(--surface)" }}
      onClick={onClick}
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
          <div className="mt-0.5">
            <DueDateBadge dueDate={task.dueDate} done={done} />
          </div>
        )}
      </div>

      {/* Priority badge */}
      <span
        className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: priorityColor + "22",
          color: priorityColor,
        }}
      >
        {t(`priority_${task.priority}` as `priority_${TaskPriority}`)}
      </span>
    </motion.div>
  );
}
