"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown, Dumbbell, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/shared/lib/supabase/client";
import { WorkoutExerciseSupabaseRepository } from "../../infrastructure/supabase/WorkoutExerciseSupabaseRepository";
import { ExerciseRow } from "./ExerciseRow";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import type { WorkoutWithStatus } from "../../domain/entities/Workout";
import type { ExerciseCatalogItem } from "../../domain/entities/WorkoutExercise";
import type { Category } from "@/modules/categories/domain/entities/Category";
import type { UUID } from "@/shared/types/database.types";

type ViewMode = "templates" | "exercises";

interface Props {
  userId: UUID;
  workouts: WorkoutWithStatus[];
  categories: Category[];
  onEdit: (workout: WorkoutWithStatus) => void;
  onDelete: (workout: WorkoutWithStatus) => void;
}

/**
 * Templates (acordeón, mismo patrón que SubjectCard.tsx en Studies) y
 * Exercises (el catálogo guardado, solo lectura) como dos pestañas de una
 * misma sección — Templates a la izquierda, Exercises a la derecha. Sin
 * línea divisoria (solo espaciado), igual criterio que el strip semanal.
 */
export function TemplatesExercisesPanel({ userId, workouts, categories, onEdit, onDelete }: Props) {
  const t = useTranslations("workouts");
  const [viewMode, setViewMode] = useState<ViewMode>("templates");
  const [expandedId, setExpandedId] = useState<UUID | null>(null);
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const getRepo = useCallback(() => new WorkoutExerciseSupabaseRepository(createClient()), []);

  useEffect(() => {
    if (viewMode !== "exercises") return;
    let cancelled = false;
    setCatalogLoading(true);
    getRepo().listCatalog(userId).then((items) => {
      if (!cancelled) { setCatalog(items); setCatalogLoading(false); }
    }).catch(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, [viewMode, userId, getRepo]);

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
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setViewMode("templates")}
          className="text-[11px] uppercase tracking-[0.12em] transition-colors"
          style={{ color: viewMode === "templates" ? "var(--text-primary)" : "var(--text-muted)" }}
        >
          {t("templates")}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("exercises")}
          className="text-[11px] uppercase tracking-[0.12em] transition-colors"
          style={{ color: viewMode === "exercises" ? "var(--text-primary)" : "var(--text-muted)" }}
        >
          {t("exercises_label")}
        </button>
      </div>

      {viewMode === "exercises" ? (
        <div className="flex flex-col mt-3">
          {catalogLoading ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>…</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{t("no_saved_exercises")}</p>
          ) : (
            catalog.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                {item.defaultType && (
                  <span className="text-[10px] uppercase tracking-wide flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {item.defaultType === "strength" ? t("type_strength") : t("type_cardio")}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
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
                        <div className="group flex items-center gap-3 p-2.5">
                          <Dumbbell size={16} strokeWidth={1.5} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : w.id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{w.name}</p>
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <motion.button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : w.id)}
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.15 }}
                              className="w-7 h-7 rounded-md flex items-center justify-center"
                              style={{ color: "var(--text-muted)" }}
                              aria-label={t("exercises_label")}
                            >
                              <ChevronDown size={14} strokeWidth={1.5} />
                            </motion.button>
                            <button type="button" onClick={() => onEdit(w)}
                              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
                              style={{ color: "var(--text-secondary)" }} aria-label={t("edit_workout")}>
                              <Pencil size={13} strokeWidth={1.5} />
                            </button>
                            <button type="button" onClick={() => onDelete(w)}
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
                              <div className="px-2.5 pb-2.5 pt-1 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
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
      )}
    </div>
  );
}
