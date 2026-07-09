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
 * StudiesView.tsx — a diferencia de aquel, cada día es clicable, resalta el
 * día SELECCIONADO (no solo hoy), y muestra si ese día tiene algo
 * programado. Siempre visible arriba de la pantalla (nunca escondido en un
 * submenú, lección de la queja real sobre Boostcamp). Sin borde externo ni
 * línea divisoria — solo el subtítulo "Schedule" arriba a la izquierda.
 */
export function WeeklyScheduleStrip({ workouts, selectedDay, onSelectDay }: Props) {
  const t = useTranslations("workouts");
  const todayDow = dayOfWeek(new Date());

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] mb-2" style={{ color: "var(--text-muted)" }}>
        {t("schedule_label")}
      </p>
      <div className="flex gap-1.5">
        {DAY_LETTERS.map((letter, idx) => {
          const day = idx + 1;
          const isSelected = day === selectedDay;
          const isToday = day === todayDow;
          const hasWorkout = workouts.some((w) => w.isActive && w.dayOfWeek.includes(day));

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex-1 aspect-square flex flex-col items-center justify-center gap-1 rounded-md transition-colors"
              style={{
                background: isSelected ? "var(--surface-hover)" : "transparent",
              }}
            >
              <span
                className="text-sm"
                style={{
                  color: isSelected ? "var(--text-primary)" : isToday ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {letter}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: hasWorkout ? "var(--text-secondary)" : "var(--text-disabled)",
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
