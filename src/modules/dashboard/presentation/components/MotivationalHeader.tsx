"use client";

import { format, getDayOfYear, addDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";

const QUOTES_ES = [
  "Buena madrugada, el esfuerzo silencioso también cuenta.",
  "Cada día es una nueva oportunidad.",
  "La constancia vence al talento.",
  "Pequeños pasos, grandes cambios.",
  "Hoy es un buen día para avanzar.",
  "Tu futuro se construye con lo que haces hoy.",
  "La disciplina es el puente entre metas y logros.",
];

const QUOTES_EN = [
  "The quiet effort counts too.",
  "Every day is a new opportunity.",
  "Consistency beats talent.",
  "Small steps, big changes.",
  "Today is a good day to move forward.",
  "Your future is built on what you do today.",
  "Discipline bridges goals and achievements.",
];

interface Props {
  date: Date;
  onDateChange: (date: Date) => void;
  habitsCount: number;
  tasksCount: number;
}

export function MotivationalHeader({ date, onDateChange, habitsCount, tasksCount }: Props) {
  const t = useTranslations("dashboard");
  const { locale } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : es;

  const quotes = locale === "en" ? QUOTES_EN : QUOTES_ES;
  const dayIndex = getDayOfYear(date);
  const quote = quotes[dayIndex % quotes.length];

  const dateStr = format(date, "EEEE d 'de' MMMM", { locale: dateFnsLocale });

  return (
    <div className="flex flex-col items-center text-center gap-2 py-4">
      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onDateChange(addDays(date, -1))}
          className="p-1 rounded-md transition-opacity active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium capitalize" style={{ color: "var(--text-secondary)" }}>
          {dateStr}
        </span>
        <button
          type="button"
          onClick={() => onDateChange(addDays(date, 1))}
          className="p-1 rounded-md transition-opacity active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Motivational quote */}
      <p className="text-lg lg:text-xl font-semibold max-w-lg" style={{ color: "var(--text-primary)" }}>
        {quote}
      </p>

      {/* Summary */}
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {t("motivational_summary", { habits: habitsCount, tasks: tasksCount })}
      </p>
    </div>
  );
}
