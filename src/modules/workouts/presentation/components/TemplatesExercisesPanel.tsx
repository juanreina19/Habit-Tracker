"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { WorkoutCard } from "./WorkoutCard";
import { ExerciseRow } from "./ExerciseRow";
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
 * Master-detail de templates: seleccionar uno muestra sus ejercicios a la
 * derecha (solo lectura). Agrupado por Categoría (reutilizando useCategories
 * ya existente) para no caer en "un montón sin organizar" — la queja real
 * detectada en Nike Training Club. No es una tabla gigante.
 */
export function TemplatesExercisesPanel({ workouts, categories, onEdit, onDelete }: Props) {
  const t = useTranslations("workouts");
  const [selectedId, setSelectedId] = useState<UUID | null>(workouts[0]?.id ?? null);
  const selected = workouts.find((w) => w.id === selectedId) ?? null;
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
      <div className="grid lg:grid-cols-2 gap-4 mt-3">
        <div className="flex flex-col gap-4 max-h-80 overflow-y-auto hide-scrollbar">
          {workouts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>{t("no_workouts_hint")}</p>
          ) : (
            Array.from(grouped.entries()).map(([key, items]) => (
              <div key={key}>
                <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                  {key === "uncategorized" ? "—" : categoryMap.get(key)?.name ?? "—"}
                </p>
                <div className="flex flex-col gap-1.5">
                  {items.map((w) => (
                    <WorkoutCard
                      key={w.id}
                      workout={w}
                      category={w.categoryId ? categoryMap.get(w.categoryId) ?? null : null}
                      compact
                      selected={w.id === selectedId}
                      onClick={() => setSelectedId(w.id)}
                      onEdit={() => onEdit(w)}
                      onDelete={() => onDelete(w)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg p-4" style={{ background: "var(--surface)" }}>
          {selected ? (
            <>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>{selected.name}</p>
              {selected.exercises.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("no_exercises")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {selected.exercises.map((ex) => (
                    <ExerciseRow key={ex.id} exercise={ex} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>—</p>
          )}
        </div>
      </div>
    </div>
  );
}
