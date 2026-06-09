import type { TaskPriority } from "../../domain/entities/Task";

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  medium: "#eab308",
  low:    "#6b7280",
};

// Set fijo de 16 iconos para el picker de tareas.
// Independiente de LUCIDE_CATEGORIES (catálogo de hábitos):
// si ese catálogo crece, el picker de tareas no crece con él.
// `as const` permite derivar el tipo literal y detectar en compilación si alguien
// agrega un nombre que no existe en LUCIDE_ICON_MAP.
export const TASK_ICON_SET = [
  "lucide:Target",    "lucide:Star",     "lucide:Zap",      "lucide:Flame",
  "lucide:BookOpen",  "lucide:Brain",    "lucide:Code",     "lucide:Lightbulb",
  "lucide:Home",      "lucide:Heart",    "lucide:Music",    "lucide:Activity",
  "lucide:Timer",     "lucide:Smile",    "lucide:Dumbbell", "lucide:Pencil",
] as const;
