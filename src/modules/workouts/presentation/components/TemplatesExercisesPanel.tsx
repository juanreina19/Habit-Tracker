"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { ExerciseRow } from "./ExerciseRow";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import type { WorkoutWithStatus } from "../../domain/entities/Workout";
import type { Category } from "@/modules/categories/domain/entities/Category";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  workouts: WorkoutWithStatus[];
  categories: Category[];
  onEdit: (workout: WorkoutWithStatus) => void;
  onDelete: (workout: WorkoutWithStatus) => void;
}

/**
 * Lista de templates en acordeón — cada fila se expande in-place mostrando
 * sus ejercicios debajo (mismo patrón que SubjectCard.tsx en Studies), no un
 * master-detail de 2 columnas. Agrupado por Categoría (reutilizando
 * useCategories) para no caer en "un montón sin organizar" — la queja real
 * detectada en Nike Training Club. No es una tabla gigante.
 */
export function TemplatesExercisesPanel({ workouts, categories, onEdit, onDelete }: Props) {
  const t = useTranslations("workouts");
  const [expandedId, setExpandedId] = useState<UUID | null>(null);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const grouped = useMemo(() => {
    const groups = new Map<string, WorkoutWithStatus[]>();
    for (const w of workouts) {
      const key = w.categoryId ?? "uncategorized";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(w);
    }
    return groups;
  }, [workouts]);

  return (
    <div>
      <SectionHeader label={t("templates").toUpperCase()} />
      <div className="flex flex-col gap-4 mt-3">
        {workouts.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{t("no_workouts_hint")}</p>
        ) : (
          Array.from(grouped.entries()).map(([key, items]) => (
            <div key={key}>
              <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                {key === "uncategorized" ? "—" : categoryMap.get(key)?.name ?? "—"}
              </p>
              <div className="flex flex-col gap-1.5">
                {items.map((w) => {
                  const isExpanded = w.id === expandedId;
                  const dayLabel = w.dayOfWeek ? DAY_LETTERS[w.dayOfWeek - 1] : t("any_day");
                  const timeLabel = w.startTime ? formatTaskTime(w.startTime) : null;
                  const subtitle = [dayLabel, timeLabel, `${w.exercises.length} ${t("exercises_label").toLowerCase()}`]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <div key={w.id} className="rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : w.id)}
                        className="group flex items-center gap-3 p-3 cursor-pointer"
                      >
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex-shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <ChevronDown size={14} strokeWidth={1.5} />
                        </motion.span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{w.name}</p>
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(w); }}
                            className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
                            style={{ color: "var(--text-secondary)" }} aria-label={t("edit_workout")}>
                            <Pencil size={13} strokeWidth={1.5} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(w); }}
                            className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
                            style={{ color: "var(--danger)" }} aria-label={t("delete")}>
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
                              {w.exercises.length === 0 ? (
                                <p className="text-sm py-2" style={{ color: "var(--text-muted)" }}>{t("no_exercises")}</p>
                              ) : (
                                w.exercises.map((ex) => <ExerciseRow key={ex.id} exercise={ex} />)
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
