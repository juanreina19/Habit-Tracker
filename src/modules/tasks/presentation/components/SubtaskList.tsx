"use client";

import { useSubtasks } from "../hooks/useSubtasks";
import type { UUID } from "@/shared/types/database.types";

export function SubtaskList({ userId, taskId }: { userId: UUID; taskId: UUID }) {
  const { subtasks, isLoading, toggleSubtask } = useSubtasks(userId, taskId);
  if (isLoading) return <div className="py-1 text-xs" style={{ color: "var(--text-muted)" }}>…</div>;
  return (
    <div className="flex flex-col gap-1 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
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
              borderColor: sub.isCompleted ? "var(--text-muted)" : "var(--border)",
              background: sub.isCompleted ? "var(--text-muted)" : "transparent",
            }}
          >
            {sub.isCompleted && (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3l2 2 4-4" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ textDecoration: sub.isCompleted ? "line-through" : "none" }}>
            {sub.title}
          </span>
        </button>
      ))}
    </div>
  );
}
