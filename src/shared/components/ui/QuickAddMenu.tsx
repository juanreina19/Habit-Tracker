"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListTodo, Repeat, BookOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectTask?: () => void;
  onSelectHabit?: () => void;
  onSelectStudy?: () => void;
}

export function QuickAddMenu({ open, onClose, onSelectTask, onSelectHabit, onSelectStudy }: Props) {
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
          className="absolute left-full top-0 ml-2 z-50 min-w-[200px] rounded-lg p-1.5 shadow-xl"
          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        >
          {/* Close button */}
          <div className="flex justify-end mb-0.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md transition-opacity active:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => { onSelectTask?.(); onClose(); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors"
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
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Repeat size={16} strokeWidth={1.5} />
            {t("new_habit")}
          </button>
          {onSelectStudy && (
            <button
              type="button"
              onClick={() => { onSelectStudy(); onClose(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <BookOpen size={16} strokeWidth={1.5} />
              {t("new_study")}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
