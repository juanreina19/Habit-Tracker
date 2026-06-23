"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListTodo, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectTask?: () => void;
  onSelectHabit?: () => void;
}

export function QuickAddMenu({ open, onClose, onSelectTask, onSelectHabit }: Props) {
  const t = useTranslations("quickAdd");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-full top-0 ml-2 z-50 min-w-[180px] rounded-lg p-1.5 shadow-xl"
          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => { onSelectTask?.(); onClose(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ListTodo size={16} strokeWidth={1.5} />
            {t("new_task")}
          </button>
          <button
            type="button"
            onClick={() => { onSelectHabit?.(); onClose(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Sparkles size={16} strokeWidth={1.5} />
            {t("new_habit")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
