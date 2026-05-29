"use client";

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
}

export default function MonthlyView({ userId, userCreatedAt }: Props) {
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

  const monthLabel = format(new Date(year, month, 1), "MMMM yyyy", { locale: es });
  // Capitalize first letter
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium" style={{ color: "#8888AA" }}>
            Vista mensual
          </p>
          <h1 className="text-3xl font-semibold mt-1" style={{ color: "#FFFFFF" }}>
            {monthTitle}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPrevMonth}
            disabled={!canGoPrev}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ background: "#1C1C1C" }}
          >
            <ChevronLeft size={18} color="#FFFFFF" />
          </button>
          <button
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ background: "#1C1C1C" }}
          >
            <ChevronRight size={18} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* Summary banner */}
      {!isLoading && data && (
        <div
          className="rounded-[20px] px-5 py-4 mb-5 flex items-center justify-between"
          style={{ background: "#111111" }}
        >
          <div>
            <p className="text-2xl font-semibold" style={{ color: "#FFFFFF" }}>
              {data.globalRate}%
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#8888AA" }}>
              {data.totalCompleted} de {data.totalScheduled} completados
            </p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-base font-semibold" style={{ color: "#4CAF82" }}>
                {data.days.filter((d) => !d.isFuture && d.completionRate === 100 && d.scheduled > 0).length}
              </p>
              <p className="text-[10px]" style={{ color: "#8888AA" }}>días perfectos</p>
            </div>
            <div>
              <p className="text-base font-semibold" style={{ color: "#FF5252" }}>
                {data.days.filter((d) => !d.isFuture && d.completionRate === 0 && d.scheduled > 0).length}
              </p>
              <p className="text-[10px]" style={{ color: "#8888AA" }}>días perdidos</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <MonthlySkeleton />
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: "#FF5252" }}>Error: {error}</p>
        </div>
      ) : data ? (
        <CalendarGrid data={data} />
      ) : null}
    </div>
  );
}

// ─── Calendar grid ─────────────────────────────────────────────────────────────

function CalendarGrid({ data }: { data: { days: DayProgress[]; month: number; year: number } }) {
  const firstDay = new Date(data.year, data.month, 1);
  // dayOfWeek: Mon=1...Sun=7, so offset = (dayOfWeek - 1): Mon=0...Sun=6
  const rawDay = firstDay.getDay(); // 0=Sun
  const startOffset = rawDay === 0 ? 6 : rawDay - 1;

  // Pad days with nulls to fill the first row
  const cells: (DayProgress | null)[] = [
    ...Array(startOffset).fill(null),
    ...data.days,
  ];

  // Fill trailing nulls to complete the last row
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }

  const weeks: (DayProgress | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="rounded-[20px] p-4" style={{ background: "#111111" }}>
      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold py-1"
            style={{ color: "#8888AA" }}
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
              day ? <DayCell key={di} day={day} /> : <div key={di} />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { color: "#4CAF82", label: "100%" },
          { color: "#A3CF8A", label: "50-99%" },
          { color: "#F5A623", label: "1-49%" },
          { color: "#FF5252", label: "0%" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px]" style={{ color: "#8888AA" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({ day }: { day: DayProgress }) {
  const { completionRate, isFuture, isToday, date } = day;
  const dayNumber = date.getDate();

  const bg = getCellBackground(completionRate, isFuture);
  const textColor = getTextColor(completionRate, isFuture);

  return (
    <div
      className="aspect-square rounded-[10px] flex flex-col items-center justify-center relative"
      style={{
        background: bg,
        outline: isToday ? "1.5px solid rgba(255,255,255,0.6)" : "none",
        outlineOffset: "-1.5px",
      }}
    >
      <span
        className="text-[13px] font-medium leading-none"
        style={{ color: textColor }}
      >
        {dayNumber}
      </span>
      {!isFuture && completionRate >= 0 && (
        <div
          className="w-1 h-1 rounded-full mt-0.5"
          style={{ background: getDotColor(completionRate) }}
        />
      )}
    </div>
  );
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

function getCellBackground(rate: number, isFuture: boolean): string {
  if (isFuture || rate === -1) return "#1A1A1A";
  if (rate === 0) return "rgba(255,82,82,0.12)";
  if (rate < 50) return "rgba(245,166,35,0.15)";
  if (rate < 100) return "rgba(163,207,138,0.15)";
  return "rgba(76,207,130,0.22)";
}

function getTextColor(rate: number, isFuture: boolean): string {
  if (isFuture || rate === -1) return "#555555";
  if (rate === 100) return "#FFFFFF";
  if (rate === 0) return "#CC6666";
  return "#CCCCCC";
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
    <div className="rounded-[20px] p-4 animate-pulse" style={{ background: "#111111" }}>
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="h-5 rounded-full mx-1" style={{ background: "#1C1C1C" }} />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="grid grid-cols-7 gap-1.5 mb-1.5">
          {Array(7).fill(null).map((_, j) => (
            <div key={j} className="aspect-square rounded-[10px]" style={{ background: "#1C1C1C" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
