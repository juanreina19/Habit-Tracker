"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Eye, Clock } from "lucide-react";
import { startOfWeek, subWeeks, endOfWeek, format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { createClient } from "@/shared/lib/supabase/client";
import { TaskSupabaseRepository } from "../../infrastructure/supabase/TaskSupabaseRepository";
import { GetWeekTasksUseCase, type WeekTasksResult, type DayTaskStatus } from "../../domain/use-cases/GetWeekTasksUseCase";
import { PRIORITY_COLORS } from "./TaskCard";
import { TaskDetailDialog, type TaskDetailEntry } from "./TaskDetailDialog";
import { useLocale } from "@/shared/i18n/useLocale";
import { isRecurring, formatTaskTime } from "../../domain/entities/Task";
import { toISODate, today } from "@/shared/lib/utils/dates";
import type { Task } from "../../domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

export function WeekTab({ userId }: Props) {
  const t = useTranslations("tasks");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;

  const [weekOffset, setWeekOffset]   = useState(0);
  const [data, setData]               = useState<WeekTasksResult | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [detailEntry, setDetailEntry] = useState<TaskDetailEntry | null>(null);

  const weekStart = useMemo(() => {
    const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return subWeeks(currentMonday, weekOffset);
  }, [weekOffset]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const repo = new TaskSupabaseRepository(createClient());
    new GetWeekTasksUseCase(repo).execute(userId, weekStart).then((result) => {
      if (!cancelled) {
        setData(result);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [userId, weekStart]);

  const goToPrevWeek = useCallback(() => setWeekOffset((o) => o + 1), []);
  const goToNextWeek = useCallback(() => setWeekOffset((o) => o - 1), []);
  const canGoNext = weekOffset > 0;

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartLabel = format(weekStart, "d MMM", { locale: dateFnsLocale });
  const weekEndLabel = format(weekEnd, "d MMM", { locale: dateFnsLocale });
  const todayISO = today();

  return (
    <div>
      {/* Header — navegación semanal */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {weekStartLabel} — {weekEndLabel}
        </p>
        <div className="flex gap-2">
          <button
            onClick={goToPrevWeek}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "var(--surface-elevated)" }}
            aria-label="previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNextWeek}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ background: "var(--surface-elevated)" }}
            aria-label="next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <WeekSkeleton />
      ) : data.entries.length === 0 ? (
        <div className="rounded-[16px] py-10 text-center text-sm" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>
          {t("week_empty")}
        </div>
      ) : (
        <>
          {/* Desktop — grid de 7 columnas tipo calendario semanal */}
          <div className="hidden lg:grid lg:grid-cols-7 lg:gap-4">
            {data.weekDays.map((date, i) => {
              const iso = toISODate(date);
              const isToday = iso === todayISO;
              const dayEntries = data.entries.filter((e) => e.days[i].isScheduled);
              return (
                <div key={iso} className="flex flex-col gap-2.5 min-w-0">
                  <div
                    className="flex items-center justify-center rounded-[10px] py-2"
                    style={{ background: isToday ? "var(--accent)" : "var(--surface)" }}
                  >
                    <span
                      className="text-sm font-semibold capitalize"
                      style={{ color: isToday ? "#fff" : "var(--text-primary)" }}
                    >
                      {format(date, "EEE d", { locale: dateFnsLocale })}
                    </span>
                  </div>
                  {/* Scroll interno por columna — evita que un día con muchas tareas
                      estire toda la fila del grid y deje a los demás días con espacio
                      vacío (mismo patrón que Google/Notion Calendar para semanas). */}
                  <div className="flex flex-col gap-2 overflow-y-auto pr-0.5" style={{ maxHeight: "min(620px, 60vh)" }}>
                    {dayEntries.length === 0 ? (
                      <div className="rounded-[12px] py-4 text-center text-xs" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                        —
                      </div>
                    ) : (
                      dayEntries.map(({ task, days }) => (
                        <WeekDayCard
                          key={task.id}
                          task={task}
                          status={days[i]}
                          dateISO={iso}
                          onViewDetail={() => setDetailEntry({ task, status: days[i], dateISO: iso })}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile — scroll horizontal con snap, una página por día */}
          <div className="lg:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5">
            {data.weekDays.map((date, i) => {
              const iso = toISODate(date);
              const isToday = iso === todayISO;
              const dayEntries = data.entries.filter((e) => e.days[i].isScheduled);
              return (
                <div key={iso} className="flex-shrink-0 w-[85%] snap-start flex flex-col gap-3">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-base font-semibold capitalize"
                      style={{ color: isToday ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      {format(date, "EEEE d", { locale: dateFnsLocale })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {dayEntries.length === 0 ? (
                      <div className="rounded-[16px] py-8 text-center text-sm" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                        —
                      </div>
                    ) : (
                      dayEntries.map(({ task, days }) => (
                        <WeekDayCard
                          key={task.id}
                          task={task}
                          status={days[i]}
                          dateISO={iso}
                          onViewDetail={() => setDetailEntry({ task, status: days[i], dateISO: iso })}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <TaskDetailDialog open={!!detailEntry} onClose={() => setDetailEntry(null)} entry={detailEntry} />
    </div>
  );
}

// ─── Tarjeta de día — solo lectura ────────────────────────────────────────────
// Deliberadamente NO reutiliza TaskCard: TaskCard usa isTaskTimeExpired (compara
// endTime contra la hora ACTUAL), una señal "now"-relative que, proyectada sobre
// varios días de la semana, reproduciría el mismo tipo de bug que isCompletedToday
// (un estado de "hoy" pintado erróneamente sobre días pasados/futuros). Esta
// tarjeta deriva su estado exclusivamente del día que representa.

function WeekDayCard({ task, status, dateISO, onViewDetail }: { task: Task; status: DayTaskStatus; dateISO: string; onViewDetail: () => void }) {
  const t = useTranslations("tasks");
  const priorityColor = PRIORITY_COLORS[task.priority];
  const isPastDay = dateISO < today();
  // "Atrasada" solo aplica a tareas únicas: una instancia recurrente no completada
  // en un día pasado no tiene un estado de "vencimiento" en el dominio (no es
  // recuperable retroactivamente), así que no se marca como tal — solo se atenúa.
  const showOverdue = !status.isCompleted && isPastDay && !isRecurring(task);
  const muted = status.isCompleted || (isPastDay && !showOverdue);
  const hasMetaRow = !!task.startTime || showOverdue;

  return (
    <div
      className="flex flex-col gap-1.5 rounded-[14px] px-3.5 py-3"
      style={{
        background: "var(--surface)",
        border: `1px solid ${priorityColor}66`,
        opacity: muted ? 0.55 : 1,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center"
          style={{
            borderColor: status.isCompleted ? priorityColor : "var(--border)",
            background:  status.isCompleted ? priorityColor : "transparent",
          }}
        >
          {status.isCompleted && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span
          className="text-sm font-medium truncate flex-1 min-w-0"
          style={{
            color: status.isCompleted ? "var(--text-secondary)" : "var(--text-primary)",
            textDecoration: status.isCompleted ? "line-through" : "none",
          }}
        >
          {task.title}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onViewDetail(); }}
          aria-label={t("view_details")}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ color: "var(--text-muted)" }}
        >
          <Eye size={15} strokeWidth={2} />
        </button>
      </div>

      {hasMetaRow && (
        <div className="flex items-center gap-2 pl-[26px]">
          {task.startTime && (
            <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
              <Clock size={11} strokeWidth={2} />
              <span className="text-xs">
                {formatTaskTime(task.startTime)}{task.endTime ? ` – ${formatTaskTime(task.endTime)}` : ""}
              </span>
            </span>
          )}
          {showOverdue && (
            <span
              className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "#ef444418", color: "#ef4444" }}
            >
              {t("overdue")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function WeekSkeleton() {
  return (
    <div className="hidden lg:grid lg:grid-cols-7 lg:gap-3">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-5 w-10 rounded animate-pulse" style={{ background: "var(--surface)" }} />
          <div className="h-16 rounded-[12px] animate-pulse" style={{ background: "var(--surface)" }} />
        </div>
      ))}
    </div>
  );
}
