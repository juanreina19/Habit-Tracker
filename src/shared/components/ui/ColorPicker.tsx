"use client";

export const PRESET_COLORS = [
  "#4CAF82",
  "#54A0FF",
  "#FF6B6B",
  "#FF9F43",
  "#FECA57",
  "#5F27CD",
  "#48DBFB",
  "#A29BFE",
  "#FD79A8",
  "#6C5CE7",
  "#00CEC9",
  "#8888AA",
];

interface Props {
  value: string | null;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{
            background: color,
            outline: value === color ? `2px solid ${color}` : "none",
            outlineOffset: "2px",
          }}
        >
          {value === color && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
