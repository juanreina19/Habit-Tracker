"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMonthly } from "../hooks/useMonthly";
import type { DayProgress } from "../../domain/use-cases/GetMonthlyProgressUseCase";
import type { UUID } from "@/shared/types/database.types";

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

interface Props {
  userId: UUID;
  userCreatedAt?: string;
  embedded?: boolean;
}

export default function MonthlyView({ userId, userCreatedAt, embedded = false }: Props) {
  const {
    data,
    isLoading,
    error,
    year,
    month,
    goToPrevMonth,
    goToNextMonth,
    canGoNext,
    canGoPrev,
  } = useMonthly(userId, userCreatedAt);

  const [selectedDay, setSelectedDay] = useState<DayProgress | null>(null);

  const monthLabel = format(new Date(year, month, 1), "MMMM yyyy", { locale: es });
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const inner = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {!embedded && (
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Vista mensual
            </p>
          )}
          <h1
            className={embedded ? "text-lg font-semibold" : "text-3xl font-semibold mt-1"}
            style={{ color: "var(--text-primary)" }}
          >
            {monthTitle}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPrevMonth}
            disabled={!canGoPrev}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ background: "var(--surface-elevated)" }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ background: "var(--surface-elevated)" }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day detail panel — shown when a day is selected */}
      {selectedDay ? (
        <DayDetail day={selectedDay} userCreatedAt={userCreatedAt} onClose={() => setSelectedDay(null)} />
      ) : (
        /* Summary banner — shown when no day is selected */
        !isLoading && data && (
          <div
            className="rounded-[20px] px-5 py-4 mb-5 flex items-center justify-between"
            style={{ background: "var(--surface)" }}
          >
            <div>
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {data.globalRate}%
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {data.totalCompleted} de {data.totalScheduled} completados
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-base font-semibold" style={{ color: "var(--accent)" }}>
                  {data.days.filter((d) => !d.isFuture && d.completionRate === 100 && d.scheduled > 0).length}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>días perfectos</p>
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: "var(--danger)" }}>
                  {data.days.filter((d) => {
                    if (d.isFuture || d.completionRate !== 0 || d.scheduled === 0) return false;
                    if (userCreatedAt) {
                      const created = new Date(userCreatedAt); created.setHours(0,0,0,0);
                      const dayMid = new Date(d.date); dayMid.setHours(0,0,0,0);
                      if (dayMid < created) return false;
                    }
                    return true;
                  }).length}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>días perdidos</p>
              </div>
            </div>
          </div>
        )
      )}

      {isLoading ? (
        <MonthlySkeleton />
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: "#FF5252" }}>Error: {error}</p>
        </div>
      ) : data ? (
        <CalendarGrid data={data} userCreatedAt={userCreatedAt} selectedDay={selectedDay} onDayClick={setSelectedDay} />
      ) : null}
    </>
  );

  if (embedded) return inner;
  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      {inner}
    </div>
  );
}

// ─── Calendar grid ─────────────────────────────────────────────────────────────

function CalendarGrid({
  data, userCreatedAt, selectedDay, onDayClick,
}: {
  data: { days: DayProgress[]; month: number; year: number };
  userCreatedAt?: string;
  selectedDay: DayProgress | null;
  onDayClick: (day: DayProgress) => void;
}) {
  const firstDay = new Date(data.year, data.month, 1);
  const rawDay = firstDay.getDay();
  const startOffset = rawDay === 0 ? 6 : rawDay - 1;

  const cells: (DayProgress | null)[] = [
    ...Array(startOffset).fill(null),
    ...data.days,
  ];

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }

  const weeks: (DayProgress | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="rounded-[20px] p-4" style={{ background: "var(--surface)" }}>
      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold py-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((day, di) =>
              day ? (
                <DayCell
                  key={di}
                  day={day}
                  userCreatedAt={userCreatedAt}
                  isSelected={selectedDay?.date.getTime() === day.date.getTime()}
                  onClick={() => onDayClick(day)}
                />
              ) : <div key={di} />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)", opacity: 0.7 }}>
        {[
          { color: "#4CAF82", label: "100%" },
          { color: "#A3CF8A", label: "50-99%" },
          { color: "#F5A623", label: "1-49%" },
          { color: "#FF5252", label: "0%" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({ day, userCreatedAt, isSelected, onClick }: {
  day: DayProgress;
  userCreatedAt?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { completionRate, isFuture, isToday, date } = day;
  const dayNumber = date.getDate();

  const isBeforeCreation = (() => {
    if (!userCreatedAt) return false;
    const created = new Date(userCreatedAt);
    created.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < created;
  })();

  const inactive = isFuture || isBeforeCreation;
  const bg = getCellBackground(completionRate, inactive);
  const textColor = getTextColor(completionRate, inactive);

  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-[10px] flex flex-col items-center justify-center relative active:scale-95 transition-transform"
      style={{
        background: bg,
        outline: isSelected
          ? "2px solid rgba(255,255,255,0.8)"
          : isToday
          ? "1.5px solid rgba(255,255,255,0.6)"
          : "none",
        outlineOffset: "-1.5px",
        opacity: isBeforeCreation ? 0.35 : 1,
        cursor: inactive ? "default" : "pointer",
      }}
    >
      <span className="text-[13px] font-medium leading-none" style={{ color: textColor }}>
        {dayNumber}
      </span>
      {!inactive && completionRate >= 0 && (
        <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: getDotColor(completionRate) }} />
      )}
    </button>
  );
}

function DayDetail({ day, userCreatedAt, onClose }: { day: DayProgress; userCreatedAt?: string; onClose: () => void }) {
  const { date, completionRate, completed, scheduled, isFuture } = day;

  const isBeforeCreation = (() => {
    if (!userCreatedAt) return false;
    const created = new Date(userCreatedAt);
    created.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < created;
  })();

  const label = format(date, "EEEE d 'de' MMMM", { locale: es });
  const title = label.charAt(0).toUpperCase() + label.slice(1);

  const accentColor =
    completionRate === 100 ? "var(--accent)"
    : completionRate >= 50 ? "#A3CF8A"
    : completionRate > 0 ? "var(--warning)"
    : "var(--danger)";

  return (
    <div
      className="rounded-[20px] px-5 py-4 mb-5 flex items-center justify-between"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div>
        <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>{title}</p>
        {isFuture || isBeforeCreation ? (
          <p className="text-base font-semibold" style={{ color: "var(--text-muted)" }}>Sin datos</p>
        ) : scheduled === 0 ? (
          <p className="text-base font-semibold" style={{ color: "var(--text-muted)" }}>Sin hábitos programados</p>
        ) : (
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {completed} / {scheduled} completados
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {!isFuture && !isBeforeCreation && scheduled > 0 && (
          <p className="text-3xl font-semibold" style={{ color: accentColor }}>
            {completionRate}%
          </p>
        )}
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--border)", color: "var(--text-secondary)", fontSize: "16px", lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

function getCellBackground(rate: number, isFuture: boolean): string {
  if (isFuture || rate === -1) return "var(--surface-elevated)";
  if (rate === 0) return "rgba(255,82,82,0.12)";
  if (rate < 50) return "rgba(245,166,35,0.15)";
  if (rate < 100) return "rgba(163,207,138,0.15)";
  return "rgba(76,207,130,0.22)";
}

function getTextColor(rate: number, isFuture: boolean): string {
  if (isFuture || rate === -1) return "var(--text-muted)";
  if (rate === 100) return "var(--text-primary)";
  if (rate === 0) return "#CC6666";
  return "var(--text-secondary)";
}

function getDotColor(rate: number): string {
  if (rate === 100) return "#4CAF82";
  if (rate >= 50) return "#A3CF8A";
  if (rate > 0) return "#F5A623";
  return "#FF5252";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MonthlySkeleton() {
  return (
    <div className="rounded-[20px] p-4 animate-pulse" style={{ background: "var(--surface)" }}>
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="h-5 rounded-full mx-1" style={{ background: "var(--surface-elevated)" }} />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="grid grid-cols-7 gap-1.5 mb-1.5">
          {Array(7).fill(null).map((_, j) => (
            <div key={j} className="aspect-square rounded-[10px]" style={{ background: "var(--surface-elevated)" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
