"use client";

import { useEffect, useRef } from "react";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PERIODS = ["AM", "PM"] as const;
type Period = (typeof PERIODS)[number];

interface Props {
  hour: string;
  minute: string;
  period: Period;
  onChangeHour: (h: string) => void;
  onChangeMinute: (m: string) => void;
  onChangePeriod: (p: Period) => void;
}

const COLUMN_HEIGHT = 140;

function Column({ options, value, onSelect }: { options: readonly string[]; value: string; onSelect: (v: string) => void }) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="flex flex-col overflow-y-auto hide-scrollbar px-0.5 py-1" style={{ height: COLUMN_HEIGHT }}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            ref={selected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(opt)}
            className="px-3 py-1 text-sm rounded-md text-center transition-colors flex-shrink-0"
            style={{
              background: selected ? "var(--surface-hover)" : "transparent",
              color: selected ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Picker de hora 100% custom (3 columnas scrolleables: hora 12h / minuto /
 * AM-PM) — a diferencia de 3 <select> nativos, cada columna es un botón por
 * fila, así el estilo oscuro de la app se aplica también a la lista
 * desplegada (los <select> nativos no permiten estilizar sus opciones).
 * Reemplaza el picker nativo del sistema, mismo layout de 3 columnas.
 */
export function TimePickerPopover({ hour, minute, period, onChangeHour, onChangeMinute, onChangePeriod }: Props) {
  return (
    <div
      className="flex divide-x divide-[var(--border)] rounded-md overflow-hidden"
      style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
    >
      <Column options={HOURS_12} value={hour} onSelect={onChangeHour} />
      <Column options={MINUTES} value={minute} onSelect={onChangeMinute} />
      <Column options={PERIODS} value={period} onSelect={(v) => onChangePeriod(v as Period)} />
    </div>
  );
}
