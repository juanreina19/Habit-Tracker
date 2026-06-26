import type { TaskPriority } from "../../domain/entities/Task";

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "var(--priority-urgent)",
  high:   "var(--priority-high)",
  medium: "var(--priority-medium)",
  low:    "var(--priority-low)",
};
