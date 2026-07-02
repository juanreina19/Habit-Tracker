"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const TASK_CHECKBOX_SIZE = { card: 20, week: 18 } as const;

interface TaskCheckboxProps {
  done:       boolean;
  size?:      number;
  animated?:  boolean;
  onToggle?:  () => void;
  ariaLabel?: string;
  variant?:   "default" | "focus";
  overdue?:   boolean;
}

export function TaskCheckbox({ done, size = TASK_CHECKBOX_SIZE.card, animated = false, onToggle, ariaLabel, variant = "default", overdue = false }: TaskCheckboxProps) {
  const px = size;
  const checkScale = px <= 18 ? 10 : 12;
  const checkStroke = "#FFFFFF";

  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (done && animated) {
      setBurst(true);
      const id = setTimeout(() => setBurst(false), 500);
      return () => clearTimeout(id);
    }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const inner = done ? (
    animated ? (
      <motion.svg
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        width={checkScale} height={checkScale} viewBox="0 0 12 12" fill="none"
      >
        <path d="M2 6l3 3 5-5" stroke={checkStroke} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    ) : (
      <svg width={checkScale} height={checkScale} viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke={checkStroke} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  ) : null;

  const borderColor = done ? "var(--accent)" : overdue ? "var(--danger)" : "var(--border)";

  const style = {
    width:       px,
    height:      px,
    borderRadius: variant === "focus" ? "50%" : 6,
    border:      `2px solid ${borderColor}`,
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
        style={{ ...style, cursor: "pointer", position: "relative" }}
        className="flex-shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {inner}
        <AnimatePresence>
          {burst && (
            <motion.span
              key="burst"
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: variant === "focus" ? "50%" : 6,
                border: "2px solid var(--accent)",
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
      </button>
    );
  }

  return (
    <span style={style} aria-hidden="true">
      {inner}
    </span>
  );
}
