"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isBefore } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/shared/i18n/useLocale";

interface Props {
  open: boolean;
  value: string; // "YYYY-MM-DD" o ""
  minDate?: string; // "YYYY-MM-DD"
  onSelect: (date: string) => void;
  onClose: () => void;
}

/**
 * Calendario mensual propio, modal centrado con el estilo oscuro de la app
 * — reemplaza el truco de <input type="date"> oculto + showPicker(), que
 * abría el calendario nativo del SO sin centrar y sin el tema de la app.
 */
export function DatePickerPopover({ open, value, minDate, onSelect, onClose }: Props) {
  const { locale } = useLocale();
  const t = useTranslations("tasks");
  const dateFnsLocale = locale === "en" ? enUS : es;
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  if (!open) return null;

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const minDateObj = minDate ? new Date(`${minDate}T00:00:00`) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-xl p-4 glass-panel-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))} className="p-1 rounded-md" style={{ color: "var(--text-secondary)" }}>
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="text-sm capitalize" style={{ color: "var(--text-primary)" }}>
            {format(viewMonth, "MMMM yyyy", { locale: dateFnsLocale })}
          </span>
          <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))} className="p-1 rounded-md" style={{ color: "var(--text-secondary)" }}>
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.slice(0, 7).map((d) => (
            <span key={d.toISOString()} className="text-[10px] text-center uppercase" style={{ color: "var(--text-muted)" }}>
              {format(d, "EEEEE", { locale: dateFnsLocale })}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isSel = selected ? isSameDay(d, selected) : false;
            const disabled = minDateObj ? isBefore(d, minDateObj) : false;
            return (
              <button
                key={d.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => { onSelect(format(d, "yyyy-MM-dd")); onClose(); }}
                className="w-8 h-8 rounded-full text-xs transition-colors"
                style={{
                  background: isSel ? "var(--text-primary)" : "transparent",
                  color: disabled
                    ? "var(--text-muted-darker)"
                    : isSel
                      ? "var(--bg)"
                      : isToday(d)
                        ? "var(--btn-primary-bg)"
                        : inMonth
                          ? "var(--text-secondary)"
                          : "var(--text-muted-darker)",
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? "default" : "pointer",
                }}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>

        {value && (
          <button
            type="button"
            onClick={() => { onSelect(""); onClose(); }}
            className="w-full mt-3 py-2 rounded-md text-xs transition-opacity active:opacity-70"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            {t("form_free")}
          </button>
        )}
      </div>
    </div>
  );
}
