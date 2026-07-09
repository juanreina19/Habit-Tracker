"use client";

import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import { dayOfWeek } from "@/shared/lib/utils/dates";
import type { Workout } from "../../domain/entities/Workout";

interface Props {
  workouts: Pick<Workout, "dayOfWeek" | "isActive">[];
  selectedDay: number; // 1..7
  onSelectDay: (day: number) => void;
}

/**
 * Versión real y atada a datos del strip semanal decorativo de
 * StudiesView.tsx (mismo estilo visual exacto: contenedor rounded-lg,
 * pastilla por día) — a diferencia de aquel, cada día es clicable, resalta
 * el día SELECCIONADO (no solo hoy), y muestra si ese día tiene algo
 * programado. Siempre visible arriba de la pantalla (nunca escondido en un
 * submenú, lección de la queja real sobre Boostcamp).
 */
export function WeeklyScheduleStrip({ workouts, selectedDay, onSelectDay }: Props) {
  const todayDow = dayOfWeek(new Date());

  return (
    <div className="rounded-lg p-4" style={{ background: "var(--surface)" }}>
      <div className="flex gap-2">
        {DAY_LETTERS.map((letter, idx) => {
          const day = idx + 1;
          const isSelected = day === selectedDay;
          const isToday = day === todayDow;
          const hasWorkout = workouts.some((w) => w.isActive && w.dayOfWeek === day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-colors"
              style={{
                background: isSelected ? "var(--btn-primary-bg)" : "transparent",
              }}
            >
              <span
                className={`text-sm ${isSelected ? "font-semibold" : "font-medium"}`}
                style={{
                  color: isSelected
                    ? "var(--btn-primary-text)"
                    : isToday
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                }}
              >
                {letter}
              </span>
              <span
                className="w-1 h-1 rounded-full"
                style={{
                  background: hasWorkout ? (isSelected ? "var(--btn-primary-text)" : "var(--accent)") : "var(--text-muted)",
                  opacity: hasWorkout ? 1 : 0.3,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
