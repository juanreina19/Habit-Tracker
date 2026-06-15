import type { TaskPriority } from "../../domain/entities/Task";

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  medium: "#eab308",
  low:    "#6b7280",
};
