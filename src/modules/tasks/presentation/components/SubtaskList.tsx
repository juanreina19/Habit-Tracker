"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubtasks } from "../hooks/useSubtasks";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
  taskId: UUID;
  isOpen: boolean;
  onCountChange?: (completed: number) => void;
}

export function SubtaskList({ userId, taskId, isOpen, onCountChange }: Props) {
  const { subtasks, isLoading, toggleSubtask } = useSubtasks(userId, taskId);

  const completedCount = subtasks.filter(s => s.isCompleted).length;
  const localPct = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  useEffect(() => {
    if (!isLoading) onCountChange?.(completedCount);
  }, [completedCount, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Subtask list — animated open/close */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {isLoading ? (
              <div className="py-1 pl-7 text-xs" style={{ color: "var(--text-muted)" }}>…</div>
            ) : (
              <div className="flex flex-col gap-1 mt-1 pt-1 pl-7">
                {subtasks.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); toggleSubtask(sub); }}
                    className="flex items-center gap-2 text-left text-xs py-0.5 transition-opacity active:opacity-70"
                    style={{ color: sub.isCompleted ? "var(--text-muted)" : "var(--text-primary)" }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 border flex items-center justify-center"
                      style={{
                        borderColor: sub.isCompleted ? "var(--text-primary)" : "var(--border)",
                        background: sub.isCompleted ? "var(--text-primary)" : "transparent",
                      }}
                    >
                      {sub.isCompleted && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none" style={{ color: "var(--bg)" }}>
                          <path d="M1 3l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span style={{ textDecoration: sub.isCompleted ? "line-through" : "none" }}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar — below list, constrained to title-content width */}
      {!isLoading && (
        <div className="mt-2 ml-7 mr-7 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${localPct}%`, background: "var(--text-primary)" }}
          />
        </div>
      )}
    </div>
  );
}
