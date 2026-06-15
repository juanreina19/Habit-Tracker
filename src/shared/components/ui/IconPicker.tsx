"use client";

import { LUCIDE_ICON_MAP, LUCIDE_CATEGORIES } from "./HabitIcon";

interface Props {
  value: string | null;
  onChange: (icon: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  categoryLabel: (key: string) => string;
}

export function IconPicker({ value, onChange, allowNone = false, noneLabel = "—", categoryLabel }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {allowNone && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="w-12 h-12 rounded-[12px] flex items-center justify-center text-sm font-medium transition-all active:scale-90"
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
        <div key={label}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            {categoryLabel(label)}
          </p>
          <div className="flex flex-wrap gap-2">
            {icons.map((iconName) => {
              const IconComp = LUCIDE_ICON_MAP[iconName];
              const iconValue = `lucide:${iconName}`;
              const isSelected = value === iconValue;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => onChange(isSelected ? null : iconValue)}
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center transition-all active:scale-90"
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
        </div>
      ))}
    </div>
  );
}
