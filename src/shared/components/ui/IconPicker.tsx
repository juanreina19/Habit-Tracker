"use client";

import { useRef } from "react";
import { LUCIDE_ICON_MAP, LUCIDE_CATEGORIES } from "./HabitIcon";

interface Props {
  value: string | null;
  onChange: (icon: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  categoryLabel: (key: string) => string;
}

// Filas fijas para el grid horizontal — el ancho crece con la cantidad de
// íconos (auto-cols), la altura queda fija en ROWS filas.
const ROWS = 3;
const CELL = 48;
const GAP = 8;
const GRID_HEIGHT = ROWS * CELL + (ROWS - 1) * GAP;

export function IconPicker({ value, onChange, allowNone = false, noneLabel = "—", categoryLabel }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToCategory = (label: string) => {
    const el = categoryRefs.current[label];
    const container = scrollRef.current;
    if (!el || !container) return;
    container.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs de categoría — saltan el scroll horizontal a esa sección,
          mismo rol que la barra de categorías del teclado de emojis de iOS. */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {LUCIDE_CATEGORIES.map(({ label }) => (
          <button
            key={label}
            type="button"
            onClick={() => scrollToCategory(label)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors"
            style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
          >
            {categoryLabel(label)}
          </button>
        ))}
      </div>

      {/* Grid horizontal — se scrollea a los lados, no verticalmente. Cada
          categoría es su propia columna de ROWS filas (grid-auto-flow:
          column), concatenadas en una sola tira scrolleable. */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto overflow-y-hidden hide-scrollbar gap-5"
        style={{ height: GRID_HEIGHT }}
      >
        {allowNone && (
          <div
            className="grid flex-shrink-0"
            style={{ gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`, gridAutoFlow: "column", gap: GAP }}
          >
            <button
              type="button"
              onClick={() => onChange(null)}
              className="w-12 h-12 rounded-md flex items-center justify-center text-sm font-medium transition-transform active:scale-90"
              style={{
                background: value === null ? "var(--surface-elevated)" : "transparent",
                border: `1.5px solid ${value === null ? "var(--btn-primary-bg)" : "var(--border)"}`,
                color: "var(--text-secondary)",
              }}
            >
              {noneLabel}
            </button>
          </div>
        )}
        {LUCIDE_CATEGORIES.map(({ label, icons }) => (
          <div
            key={label}
            ref={(el) => { categoryRefs.current[label] = el; }}
            className="grid flex-shrink-0"
            style={{ gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`, gridAutoFlow: "column", gap: GAP }}
          >
            {icons.map((iconName) => {
              const IconComp = LUCIDE_ICON_MAP[iconName];
              const iconValue = `lucide:${iconName}`;
              const isSelected = value === iconValue;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => onChange(isSelected ? null : iconValue)}
                  className="w-12 h-12 rounded-md flex items-center justify-center transition-transform active:scale-90"
                  style={{
                    background: isSelected ? "var(--surface-elevated)" : "transparent",
                    border: `1.5px solid ${isSelected ? "var(--btn-primary-bg)" : "var(--border)"}`,
                    color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  <IconComp size={22} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
