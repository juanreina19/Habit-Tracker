"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale } from "@/shared/i18n/useLocale";
import { PRIORITY_COLORS } from "../constants/taskColors";
import { isRecurring, formatTaskTime } from "../../domain/entities/Task";
import { today } from "@/shared/lib/utils/dates";
import { useSubtasks } from "../hooks/useSubtasks";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "./TaskCheckbox";
import type { DayTaskStatus } from "../../domain/use-cases/GetWeekTasksUseCase";
import type { Task } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

export interface TaskDetailEntry {
  task: Task;
  status: DayTaskStatus;
  dateISO: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  entry: TaskDetailEntry | null;
  userId: UUID;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Modal de solo lectura para una celda (tarea, día) del grid de Semana.
// "Fecha" y "Estado" se derivan exclusivamente de `entry.dateISO`/`entry.status`
// — nunca de `task.dueDate` (null en recurrentes) ni `task.isCompletedToday`
// (atado a "hoy"), por la misma disciplina que ya rige WeekDayCard.
export function TaskDetailDialog({ open, onClose, entry, userId }: Props) {
  const t = useTranslations("tasks");
  const tDays = useTranslations("dayLabels");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;
  const { subtasks, toggleSubtask } = useSubtasks(userId, entry?.task.id ?? null);

  if (!entry) return null;
  const { task, status, dateISO } = entry;

  const priorityColor = PRIORITY_COLORS[task.priority];
  const recurring = isRecurring(task);
  const isPastDay = dateISO < today();
  const showOverdue = !status.isCompleted && isPastDay && !recurring;

  let statusLabel: string;
  let statusColor: string;
  if (status.isCompleted) {
    statusLabel = t("status_completed");
    statusColor = priorityColor;
  } else if (showOverdue) {
    statusLabel = t("overdue");
    statusColor = "var(--danger)";
  } else {
    statusLabel = t("status_pending");
    statusColor = "var(--text-secondary)";
  }

  const recurrenceLabel = recurring
    ? task.recurrenceDays!.length === 7
      ? t("recurrence_daily")
      : task.recurrenceDays!.map((d) => tDays(`d${d}` as Parameters<typeof tDays>[0])).join(" ")
    : t("recurrence_once");

  const timeLabel = task.startTime
    ? `${formatTaskTime(task.startTime)}${task.endTime ? ` – ${formatTaskTime(task.endTime)}` : ""}`
    : t("no_time");

  const dateLabel = format(parseLocalDate(dateISO), "EEEE d 'de' MMMM", { locale: dateFnsLocale });
  const createdLabel = t("created_on", { date: format(new Date(task.createdAt), "d MMM yyyy", { locale: dateFnsLocale }) });

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden"
          style={{ background: "var(--surface)", maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto p-6" style={{ maxHeight: "90dvh" }}>
            <Dialog.Title className="text-lg font-semibold mb-1 truncate" style={{ color: "var(--text-primary)" }}>
              {task.title}
            </Dialog.Title>
            <p className="text-xs uppercase tracking-wider font-semibold mb-5" style={{ color: "var(--text-muted)" }}>
              {t("view_details")}
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${task.id}:${dateISO}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <DetailRow label={t("description_label")}>
                  <span style={{ color: task.description ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {task.description || t("no_description")}
                  </span>
                </DetailRow>

                <DetailRow label={t("priority_label")}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: priorityColor }} />
                    {t(`priority_${task.priority}`)}
                  </span>
                </DetailRow>

                <DetailRow label={t("date_label")}>
                  <span className="capitalize">{dateLabel}</span>
                </DetailRow>

                <DetailRow label={t("schedule_label")}>{timeLabel}</DetailRow>

                <DetailRow label={t("recurrence_label")}>{recurrenceLabel}</DetailRow>

                <DetailRow label={t("status_label")}>
                  <span className="font-medium" style={{ color: statusColor }}>{statusLabel}</span>
                </DetailRow>

                {subtasks.length > 0 && (
                  <DetailRow label={t("subtasks_label")}>
                    <div className="flex flex-col gap-2">
                      {subtasks.map((s) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <TaskCheckbox
                            done={s.isCompleted}
                            size={TASK_CHECKBOX_SIZE.week}
                            onToggle={() => toggleSubtask(s)}
                            ariaLabel={s.title}
                          />
                          <span
                            className="flex-1 text-sm"
                            style={{
                              color: s.isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                              textDecoration: s.isCompleted ? "line-through" : "none",
                            }}
                          >
                            {s.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </DetailRow>
                )}

                <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
                  {createdLabel}
                </p>
              </motion.div>
            </AnimatePresence>

            <button
              onClick={onClose}
              className="w-full mt-6 py-3 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
              style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
            >
              {t("close")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div className="text-sm" style={{ color: "var(--text-primary)" }}>
        {children}
      </div>
    </div>
  );
}
