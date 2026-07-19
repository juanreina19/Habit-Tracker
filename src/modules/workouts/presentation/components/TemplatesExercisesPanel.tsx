"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown, Dumbbell, Pencil, Trash2, Check, X } from "lucide-react";
import { createClient } from "@/shared/lib/supabase/client";
import { WorkoutExerciseSupabaseRepository } from "../../infrastructure/supabase/WorkoutExerciseSupabaseRepository";
import { UpdateExerciseCatalogUseCase } from "../../domain/use-cases/UpdateExerciseCatalogUseCase";
import { DeleteExerciseCatalogUseCase } from "../../domain/use-cases/DeleteExerciseCatalogUseCase";
import { ExerciseRow } from "./ExerciseRow";
import { Loader } from "@/shared/components/ui/Loader";
import { Tooltip, TooltipProvider } from "@/shared/components/ui/Tooltip";
import { DAY_ABBR_KEYS } from "@/shared/constants/dayLabels";
import { formatTaskTime } from "@/modules/tasks/domain/entities/Task";
import { useTimeFormat } from "@/shared/components/TimeFormatProvider";
import type { WorkoutWithStatus } from "../../domain/entities/Workout";
import type { ExerciseCatalogItem, ExerciseType } from "../../domain/entities/WorkoutExercise";
import type { Category } from "@/modules/categories/domain/entities/Category";
import type { UUID } from "@/shared/types/database.types";

type ViewMode = "templates" | "exercises";
type CatalogFilter = "all" | ExerciseType;

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
 * misma sección — Templates a la izquierda, Exercises a la derecha.
 */
export function TemplatesExercisesPanel({ userId, workouts, categories, onEdit, onDelete }: Props) {
  const t = useTranslations("workouts");
  const { format } = useTimeFormat();
  const [viewMode, setViewMode] = useState<ViewMode>("templates");
  const [expandedId, setExpandedId] = useState<UUID | null>(null);
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [editingCatalogId, setEditingCatalogId] = useState<UUID | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<ExerciseType | null>(null);
  const [deletingCatalogItem, setDeletingCatalogItem] = useState<ExerciseCatalogItem | null>(null);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const getRepo = useCallback(() => new WorkoutExerciseSupabaseRepository(createClient()), []);

  const filteredCatalog = useMemo(
    () => (catalogFilter === "all" ? catalog : catalog.filter((item) => item.defaultType === catalogFilter)),
    [catalog, catalogFilter]
  );

  // Qué plantillas usan cada ejercicio del catálogo — para advertir antes de borrar.
  const templatesByCatalogId = useMemo(() => {
    const map = new Map<UUID, string[]>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (!ex.catalogExerciseId) continue;
        const names = map.get(ex.catalogExerciseId) ?? [];
        if (!names.includes(w.name)) names.push(w.name);
        map.set(ex.catalogExerciseId, names);
      }
    }
    return map;
  }, [workouts]);

  const startEditCatalog = (item: ExerciseCatalogItem) => {
    setEditingCatalogId(item.id);
    setEditName(item.name);
    setEditType(item.defaultType);
  };

  const cancelEditCatalog = () => {
    setEditingCatalogId(null);
    setEditName("");
    setEditType(null);
  };

  const saveEditCatalog = async () => {
    if (!editingCatalogId || !editName.trim()) return;
    const updated = await new UpdateExerciseCatalogUseCase(getRepo()).execute(editingCatalogId, { name: editName, defaultType: editType });
    setCatalog((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    cancelEditCatalog();
  };

  const confirmDeleteCatalog = async () => {
    if (!deletingCatalogItem) return;
    const id = deletingCatalogItem.id;
    setDeletingCatalogItem(null);
    setCatalog((prev) => prev.filter((item) => item.id !== id));
    await new DeleteExerciseCatalogUseCase(getRepo()).execute(id);
  };

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
    <>
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
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
          <div className="flex gap-1.5 mb-3">
            {(["all", "strength", "cardio"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setCatalogFilter(f)}
                className="px-3 py-1 rounded-full text-[11px] transition-colors"
                style={{
                  background: catalogFilter === f ? "var(--surface-hover)" : "transparent",
                  color: catalogFilter === f ? "var(--text-primary)" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {f === "all" ? t("filter_all") : f === "strength" ? t("type_strength") : t("type_cardio")}
              </button>
            ))}
          </div>

          {catalogLoading ? (
            <div className="flex justify-center py-6">
              <Loader size={32} />
            </div>
          ) : filteredCatalog.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{t("no_saved_exercises")}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredCatalog.map((item) => (
                <div key={item.id} className="rounded-md p-2 flex items-center gap-2.5" style={{ border: "1px solid var(--border)" }}>
                  {editingCatalogId === item.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEditCatalog(); if (e.key === "Escape") cancelEditCatalog(); }}
                        autoFocus
                        className="flex-1 min-w-0 rounded-md px-2 py-1 text-sm outline-none"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid transparent" }}
                      />
                      <TooltipProvider>
                        <div className="flex gap-1 flex-shrink-0">
                          <Tooltip label={t("type_strength")} side="top">
                            <button type="button" onClick={() => setEditType("strength")}
                              className="w-2.5 h-2.5 rounded-full transition-transform"
                              style={{ background: "var(--text-primary)", opacity: editType === "strength" ? 1 : 0.25, transform: editType === "strength" ? "scale(1.2)" : "scale(1)" }}
                              aria-label={t("type_strength")} />
                          </Tooltip>
                          <Tooltip label={t("type_cardio")} side="top">
                            <button type="button" onClick={() => setEditType("cardio")}
                              className="w-2.5 h-2.5 rounded-full transition-transform"
                              style={{ background: "var(--text-muted)", opacity: editType === "cardio" ? 1 : 0.25, transform: editType === "cardio" ? "scale(1.2)" : "scale(1)" }}
                              aria-label={t("type_cardio")} />
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                      <button type="button" onClick={saveEditCatalog} className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ color: "var(--text-primary)" }} aria-label={t("save")}>
                        <Check size={14} strokeWidth={2} />
                      </button>
                      <button type="button" onClick={cancelEditCatalog} className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ color: "var(--text-muted)" }} aria-label={t("cancel")}>
                        <X size={14} strokeWidth={2} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      {item.defaultType && (
                        <span className="text-[10px] uppercase tracking-wide flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                          {item.defaultType === "strength" ? t("type_strength") : t("type_cardio")}
                        </span>
                      )}
                      <button type="button" onClick={() => startEditCatalog(item)}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70 flex-shrink-0"
                        style={{ color: "var(--text-secondary)" }} aria-label={t("edit_exercise")}>
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                      <button type="button" onClick={() => setDeletingCatalogItem(item)}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70 flex-shrink-0"
                        style={{ color: "var(--danger)" }} aria-label={t("delete")}>
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-3">
          {workouts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{t("no_workouts_hint")}</p>
          ) : (
            Array.from(grouped.entries()).map(([key, items]) => (
              <div key={key}>
                {key !== "uncategorized" && (
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                    {categoryMap.get(key)?.name ?? "—"}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {items.map((w, idx) => {
                    const isExpanded = w.id === expandedId;
                    const dayLabel = w.dayOfWeek.length > 0
                      ? w.dayOfWeek.map((d) => t(DAY_ABBR_KEYS[d - 1] as Parameters<typeof t>[0])).join(", ")
                      : t("any_day");
                    const timeLabel = w.startTime ? formatTaskTime(w.startTime, format) : null;
                    const subtitle = [dayLabel, timeLabel, `${w.exercises.length} ${t("exercises_label").toLowerCase()}`]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <div key={w.id} style={idx === items.length - 1 ? undefined : { borderBottom: "1px solid var(--border)" }}>
                        <div className="group flex items-center gap-2.5 py-2">
                          <Dumbbell size={16} strokeWidth={2} className="flex-shrink-0 self-start mt-0.5" style={{ color: "var(--text-muted)" }} />
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
                              <ChevronDown size={14} strokeWidth={2} />
                            </motion.button>
                            <button type="button" onClick={() => onEdit(w)}
                              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
                              style={{ color: "var(--text-secondary)" }} aria-label={t("edit_workout")}>
                              <Pencil size={13} strokeWidth={2} />
                            </button>
                            <button type="button" onClick={() => onDelete(w)}
                              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity active:opacity-70"
                              style={{ color: "var(--danger)" }} aria-label={t("delete")}>
                              <Trash2 size={13} strokeWidth={2} />
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
                              <div className="pl-[26px] pr-2.5 pb-2.5 pt-1 flex flex-col gap-1">
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

    {deletingCatalogItem && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={() => setDeletingCatalogItem(null)}
      >
        <div
          className="w-full max-w-sm rounded-xl p-6 glass-panel-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {t("delete_exercise_title")}
          </p>
          {(() => {
            const usedIn = templatesByCatalogId.get(deletingCatalogItem.id) ?? [];
            if (usedIn.length === 0) return null;
            return (
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                {usedIn.length === 1 ? t("delete_exercise_used_in_one") : t("delete_exercise_used_in_many")}{" "}
                <span style={{ color: "var(--text-secondary)" }}>{usedIn.join(", ")}</span>
              </p>
            );
          })()}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setDeletingCatalogItem(null)}
              className="flex-1 py-2 rounded-md text-sm"
              style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={confirmDeleteCatalog}
              className="flex-1 py-2 rounded-md text-sm"
              style={{ background: "var(--danger)", color: "#fff" }}
            >
              {t("delete")}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
