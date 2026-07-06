"use client";

import { format, getDayOfYear, addDays, getHours } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";

const QUOTES_ES = [
  "el esfuerzo silencioso también cuenta.",
  "cada día es una nueva oportunidad.",
  "la constancia vence al talento.",
  "pequeños pasos, grandes cambios.",
  "hoy es un buen día para avanzar.",
  "tu futuro se construye con lo que haces hoy.",
  "la disciplina es el puente entre metas y logros.",
];

const QUOTES_EN = [
  "the quiet effort counts too.",
  "every day is a new opportunity.",
  "consistency beats talent.",
  "small steps, big changes.",
  "today is a good day to move forward.",
  "your future is built on what you do today.",
  "discipline bridges goals and achievements.",
];

function getGreeting(locale: string): string {
  const hour = getHours(new Date());
  if (locale === "en") {
    if (hour < 6) return "Good night,";
    if (hour < 12) return "Good morning,";
    if (hour < 18) return "Good afternoon,";
    return "Good evening,";
  }
  if (hour < 6) return "Buena madrugada,";
  if (hour < 12) return "Buenos días,";
  if (hour < 18) return "Buenas tardes,";
  return "Buenas noches,";
}

interface Props {
  date: Date;
  onDateChange: (date: Date) => void;
  habitsCount: number;
  tasksCount: number;
}

export function MotivationalHeader({ date, onDateChange, habitsCount, tasksCount }: Props) {
  const { locale } = useLocale();
  const t = useTranslations("dashboard");
  const dateFnsLocale = locale === "en" ? enUS : es;

  const quotes = locale === "en" ? QUOTES_EN : QUOTES_ES;
  const dayIndex = getDayOfYear(date);
  const quote = quotes[dayIndex % quotes.length];
  const greeting = getGreeting(locale);

  const weekday  = format(date, "EEEE", { locale: dateFnsLocale });
  const dateOnly = format(date, locale === "en" ? "MMMM d" : "d 'de' MMMM", { locale: dateFnsLocale });

  return (
    <div className="flex flex-col items-center text-center gap-1.5 py-4">
      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onDateChange(addDays(date, -1))}
          className="p-1 rounded-md transition-opacity active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium uppercase tracking-widest">
          <span style={{ color: "var(--text-primary)" }}>{weekday}</span>
          {" "}
          <span style={{ color: "var(--text-muted)" }}>{dateOnly}</span>
        </span>
        <button
          type="button"
          onClick={() => onDateChange(addDays(date, 1))}
          className="p-1 rounded-md transition-opacity active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Greeting + motivational quote */}
      <p className="max-w-lg mt-1">
        <span className="text-xl lg:text-2xl font-medium" style={{ color: "var(--text-primary)" }}>
          {greeting}
        </span>{" "}
        <span className="font-serif italic text-lg lg:text-xl" style={{ color: "var(--text-secondary)" }}>
          {quote}
        </span>
      </p>

      {/* Summary */}
      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
        {t("motivational_summary", {
          habits: t("motivational_habits_count", { count: habitsCount }),
          tasks: t("motivational_tasks_count", { count: tasksCount }),
        })}
      </p>
    </div>
  );
}
