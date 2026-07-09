"use client";

import { useTranslations } from "next-intl";
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
 * StudiesView.tsx (mismo contenedor bg+borde delgado) — a diferencia de
 * aquel, cada día es clicable, resalta el día SELECCIONADO (no solo hoy), y
 * muestra si ese día tiene algo programado. Siempre visible arriba de la
 * pantalla (nunca escondido en un submenú, lección de la queja real sobre
 * Boostcamp).
 */
export function WeeklyScheduleStrip({ workouts, selectedDay, onSelectDay }: Props) {
  const t = useTranslations("workouts");
  const todayDow = dayOfWeek(new Date());

  return (
    <div className="rounded-lg p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <div className="flex gap-1.5">
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
              className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-md transition-colors"
              style={{
                background: isSelected ? "var(--surface-hover)" : "transparent",
              }}
            >
              <span
                className={`text-sm ${isSelected ? "font-semibold" : "font-medium"}`}
                style={{
                  color: isSelected ? "var(--text-primary)" : isToday ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {letter}
              </span>
              <span
                className="w-1 h-1 rounded-full"
                style={{
                  background: hasWorkout ? "var(--accent)" : "var(--text-muted)",
                  opacity: hasWorkout ? 1 : 0.3,
                }}
              />
              {isSelected && isToday && (
                <span className="text-[9px] leading-none" style={{ color: "var(--text-muted)" }}>
                  {t("today_label")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
