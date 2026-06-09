"use client";

import { motion } from "framer-motion";

export const TASK_CHECKBOX_SIZE = { card: 24, week: 18 } as const;

interface TaskCheckboxProps {
  done:       boolean;
  size?:      number;
  animated?:  boolean;
  onToggle?:  () => void;
  ariaLabel?: string;
}

export function TaskCheckbox({ done, size = TASK_CHECKBOX_SIZE.card, animated = false, onToggle, ariaLabel }: TaskCheckboxProps) {
  const px = size;
  const checkScale = px <= 18 ? 10 : 12;

  const inner = done ? (
    animated ? (
      <motion.svg
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        width={checkScale} height={checkScale} viewBox="0 0 12 12" fill="none"
      >
        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    ) : (
      <svg width={checkScale} height={checkScale} viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  ) : null;

  const style = {
    width:       px,
    height:      px,
    borderRadius: 6,
    border:      "2px solid var(--border)",
    background:  done ? "var(--accent)" : "transparent",
    flexShrink:  0,
    display:     "flex",
    alignItems:  "center",
    justifyContent: "center",
    transition:  "background 0.15s, border-color 0.15s",
  };

  if (onToggle) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={ariaLabel}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{ ...style, cursor: "pointer" }}
        className="flex-shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {inner}
      </button>
    );
  }

  return (
    <span style={style} aria-hidden="true">
      {inner}
    </span>
  );
}
