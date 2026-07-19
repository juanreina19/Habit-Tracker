"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";
import { usePlanner, type ScheduledBlock } from "../hooks/usePlanner";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import { PRIORITY_COLORS } from "@/modules/tasks/presentation/constants/taskColors";
import type { UUID } from "@/shared/types/database.types";

const TIMELINE_START = 6;
const TIMELINE_END = 23;
const HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);
const HOUR_HEIGHT = 68;

interface Props {
  userId: UUID;
}

export default function PlannerView({ userId }: Props) {
  const t = useTranslations("planner");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;
  const planner = usePlanner(userId);

  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);

  const dateStr = format(planner.date, "EEEE d 'de' MMMM", { locale: dateFnsLocale });

  const handleTimeClick = (hour: number) => {
    if (!schedulingTaskId) return;
    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    planner.scheduleTask(schedulingTaskId as UUID, timeStr);
    setSchedulingTaskId(null);
  };

  if (planner.isLoading) return <PlannerSkeleton />;

  return (
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {t("subtitle")}
          </p>
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={planner.prevDay} className="p-1 rounded-md transition-opacity active:opacity-60" style={{ color: "var(--text-secondary)" }}>
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={planner.goToToday}
            className="text-base font-medium capitalize"
            style={{ color: "var(--text-primary)" }}
          >
            {dateStr}
          </button>
          <button type="button" onClick={planner.nextDay} className="p-1 rounded-md transition-opacity active:opacity-60" style={{ color: "var(--text-secondary)" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
        {/* Pending sidebar */}
        <div className="lg:w-[280px] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-secondary)" }}>
              {t("pending")}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.4 }} />
          </div>

          <div className="flex flex-col gap-2">
            {planner.pendingTasks.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: "var(--text-muted)" }}>
                {t("no_pending")}
              </p>
            ) : (
              planner.pendingTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <PendingTaskCard
                    task={task}
                    isScheduling={schedulingTaskId === task.id}
                    onScheduleClick={() => setSchedulingTaskId(
                      schedulingTaskId === task.id ? null : task.id
                    )}
                  />
                </motion.div>
              ))
            )}

          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 min-w-0">
          {schedulingTaskId && (
            <p className="text-xs mb-2 px-1" style={{ color: "var(--accent)" }}>
              {t("drop_hint")}
            </p>
          )}

          <div className="relative rounded-lg overflow-hidden glass-panel">
            {/* Now indicator */}
            <NowIndicator />

            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-b"
                style={{
                  height: HOUR_HEIGHT,
                  borderColor: "var(--border)",
                  cursor: schedulingTaskId ? "pointer" : "default",
                }}
                onClick={() => handleTimeClick(hour)}
              >
                <span
                  className="absolute left-3 top-1 text-[10px] font-medium tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </span>

                {/* Blocks at this hour */}
                {planner.scheduledBlocks
                  .filter((b) => Math.floor(b.startMin / 60) === hour)
                  .map((block) => (
                    <TimelineBlock
                      key={block.id}
                      block={block}
                      onUnschedule={block.type === "task"
                        ? () => planner.unscheduleTask(block.id.replace("task-", "") as UUID)
                        : undefined
                      }
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingTaskCard({
  task, isScheduling, onScheduleClick,
}: {
  task: TaskWithStatus;
  isScheduling: boolean;
  onScheduleClick: () => void;
}) {
  return (
    <div
      className="rounded-lg p-2.5 flex items-center gap-2 glass-panel"
      style={isScheduling ? { background: "var(--accent)15", border: "1px solid var(--accent)40" } : undefined}
    >
      {/* Priority dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: PRIORITY_COLORS[task.priority] }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.dueDate && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {task.dueDate}
            </span>
          )}
          {(task.subtaskTotal ?? 0) > 0 && (
            <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
              {task.subtaskCompleted ?? 0}/{task.subtaskTotal}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onScheduleClick}
        className="flex-shrink-0 p-1.5 rounded-md transition-colors"
        style={{
          color: isScheduling ? "var(--accent)" : "var(--text-muted)",
          background: isScheduling ? "var(--accent)20" : "transparent",
        }}
      >
        <Clock size={14} />
      </button>
    </div>
  );
}

function TimelineBlock({ block, onUnschedule }: { block: ScheduledBlock; onUnschedule?: () => void }) {
  const startOffset = block.startMin % 60;
  const duration = block.endMin - block.startMin;
  const topPx = (startOffset / 60) * HOUR_HEIGHT;
  const heightPx = Math.max(20, (duration / 60) * HOUR_HEIGHT);

  return (
    <div
      className="absolute left-16 right-3 rounded-md flex items-center px-2 overflow-hidden"
      style={{
        top: topPx,
        height: heightPx,
        background: `${block.color}20`,
        border: `1px solid ${block.color}40`,
        cursor: onUnschedule ? "pointer" : "default",
      }}
      onClick={(e) => {
        if (onUnschedule) { e.stopPropagation(); onUnschedule(); }
      }}
      title={onUnschedule ? "Click to unschedule" : undefined}
    >
      <span className="text-[10px] font-medium truncate" style={{ color: block.color }}>
        {block.label}
      </span>
    </div>
  );
}

function NowIndicator() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const offset = nowMin - TIMELINE_START * 60;
  if (offset < 0 || offset > (TIMELINE_END - TIMELINE_START) * 60) return null;

  const topPx = (offset / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: topPx }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full" style={{ background: "var(--danger)" }} />
        <div className="flex-1 h-px" style={{ background: "var(--danger)" }} />
      </div>
    </div>
  );
}

function PlannerSkeleton() {
  return (
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10 skeleton-shimmer">
      <div className="h-7 w-32 rounded-lg mb-6" style={{ background: "var(--surface)" }} />
      <div className="flex gap-6">
        <div className="w-[280px] flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg" style={{ background: "var(--surface)" }} />
          ))}
        </div>
        <div className="flex-1 h-[400px] rounded-lg" style={{ background: "var(--surface)" }} />
      </div>
    </div>
  );
}
