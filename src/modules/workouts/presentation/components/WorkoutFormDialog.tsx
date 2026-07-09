"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { X, Trash2, Plus, Save } from "lucide-react";
import { useWorkoutExercises } from "../hooks/useWorkoutExercises";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { ExerciseReorderItem, type ExerciseDraft } from "./ExerciseReorderItem";
import { ExerciseCatalogAutocomplete } from "./ExerciseCatalogAutocomplete";
import { WORKOUT_TYPE_COLORS } from "../constants/workoutColors";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import { dayOfWeek } from "@/shared/lib/utils/dates";
import type { Workout, WorkoutType, CreateWorkoutInput, UpdateWorkoutInput } from "../../domain/entities/Workout";
import type { ExerciseType } from "../../domain/entities/WorkoutExercise";
import type { UUID } from "@/shared/types/database.types";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WORKOUT_TYPES: WorkoutType[] = ["strength", "cardio", "mixed"];

interface Props {
  open: boolean;
  onClose: () => void;
  workout?: Workout | null;
  userId: UUID;
  onCreate: (input: CreateWorkoutInput) => Promise<Workout | null>;
  onUpdate: (id: UUID, input: UpdateWorkoutInput) => Promise<void>;
  onDelete: (id: UUID) => Promise<void>;
}

export function WorkoutFormDialog({ open, onClose, workout, userId, onCreate, onUpdate, onDelete }: Props) {
  const t = useTranslations("workouts");
  const isEdit = !!workout;

  const [name, setName] = useState("");
  const [type, setType] = useState<WorkoutType>("strength");
  const [selectedDay, setSelectedDay] = useState<number>(dayOfWeek(new Date()));
  const [startTime, setStartTime] = useState("");
  const [estimatedDurationMin, setEstimatedDurationMin] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  const [nameError, setNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>("strength");
  const [newExerciseSets, setNewExerciseSets] = useState("");
  // Buffer de ejercicios mientras el workout todavía no existe (modo crear) —
  // se persisten secuencialmente contra el id real recién creado en
  // handleSave, a diferencia del bug confirmado en TaskFormDialog donde las
  // subtareas tecleadas al crear se descartan silenciosamente.
  const [localExercises, setLocalExercises] = useState<ExerciseDraft[]>([]);

  const { categories } = useCategories(userId);
  const { exercises, createExercise, updateExercise, deleteExercise, reorderExercises, searchCatalog } =
    useWorkoutExercises(userId, workout?.id ?? null);

  useEffect(() => {
    if (!open) return;
    setName(workout?.name ?? "");
    setType(workout?.type ?? "strength");
    setSelectedDay(workout?.dayOfWeek ?? dayOfWeek(new Date()));
    setStartTime(workout?.startTime?.slice(0, 5) ?? "");
    setEstimatedDurationMin(workout?.estimatedDurationMin ? String(workout.estimatedDurationMin) : "");
    setCategoryId(workout?.categoryId ?? null);
    setNameError("");
    setIsSaving(false);
    setIsDeleting(false);
    setConfirmDelete(false);
    setNewExerciseName("");
    setNewExerciseType("strength");
    setNewExerciseSets("");
    setLocalExercises([]);
    setCatOpen(false);
  }, [open, workout]);

  const displayExercises: ExerciseDraft[] = isEdit
    ? exercises.map((e) => ({ id: e.id, name: e.name, type: e.type, sets: e.sets, notes: e.notes }))
    : localExercises;

  const handleAddExercise = async () => {
    const value = newExerciseName.trim();
    if (!value) return;
    const setsNum = newExerciseSets.trim() ? Number(newExerciseSets) : null;

    if (isEdit && workout) {
      await createExercise({ workoutId: workout.id, name: value, type: newExerciseType, sets: setsNum });
    } else {
      setLocalExercises((prev) => [...prev, { id: crypto.randomUUID(), name: value, type: newExerciseType, sets: setsNum, notes: null }]);
    }
    setNewExerciseName("");
    setNewExerciseSets("");
  };

  const handleDeleteExercise = (id: string) => {
    if (isEdit) deleteExercise(id);
    else setLocalExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleChangeExerciseType = (id: string, nextType: ExerciseType) => {
    if (isEdit) updateExercise(id, { type: nextType });
    else setLocalExercises((prev) => prev.map((e) => (e.id === id ? { ...e, type: nextType } : e)));
  };

  const handleReorderExercises = (next: ExerciseDraft[]) => {
    if (isEdit) {
      const byId = new Map(exercises.map((e) => [e.id, e]));
      reorderExercises(next.map((d) => byId.get(d.id)).filter((e): e is typeof exercises[number] => !!e));
    } else {
      setLocalExercises(next);
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("workout_name")); return; }

    setIsSaving(true);
    try {
      const commonInput = {
        name: trimmed,
        type,
        dayOfWeek: selectedDay,
        startTime: startTime || null,
        estimatedDurationMin: estimatedDurationMin.trim() ? Number(estimatedDurationMin) : null,
        categoryId: categoryId ?? null,
      };

      if (isEdit && workout) {
        await onUpdate(workout.id, commonInput);
      } else {
        const created = await onCreate(commonInput);
        if (created) {
          for (const ex of localExercises) {
            await createExercise({ workoutId: created.id, name: ex.name, type: ex.type, sets: ex.sets, notes: ex.notes });
          }
        }
      }
      onClose();
    } catch {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workout) return;
    setIsDeleting(true);
    try {
      await onDelete(workout.id);
      onClose();
    } catch {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden"
          style={{ background: "var(--bg)", maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto px-6 pt-3 pb-6 hide-scrollbar" style={{ maxHeight: "90dvh" }}>
            <div className="flex items-center justify-end mb-0.5 -mr-3">
              <Dialog.Title className="sr-only">
                {isEdit ? t("edit_workout") : t("add_workout")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="p-1 rounded-md transition-opacity active:opacity-70" style={{ color: "var(--text-muted)" }}>
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <AnimatePresence mode="wait">
              {confirmDelete ? (
                <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("delete_workout_confirm")}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 rounded-md text-sm font-medium transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
                      {t("cancel")}
                    </button>
                    <button onClick={handleDelete} disabled={isDeleting}
                      className="flex-1 py-3 rounded-md text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50"
                      style={{ background: "var(--danger)", color: "#ffffff" }}>
                      {isDeleting ? "…" : t("delete")}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
                  {/* Nombre */}
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError(""); }}
                      placeholder={t("workout_name_placeholder")}
                      autoFocus
                      className="w-full text-2xl font-normal outline-none bg-transparent"
                      style={{ color: "var(--text-primary)" }}
                    />
                    {nameError && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{nameError}</p>}
                  </div>

                  {/* Tipo — fila de 3 segmentos */}
                  <div className="flex gap-2">
                    {WORKOUT_TYPES.map((wt) => (
                      <button
                        key={wt}
                        type="button"
                        onClick={() => setType(wt)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors"
                        style={{
                          background: type === wt ? "var(--text-primary)" : "var(--surface-elevated)",
                          color: type === wt ? "var(--bg)" : "var(--text-secondary)",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: type === wt ? "var(--bg)" : WORKOUT_TYPE_COLORS[wt] }} />
                        {t(`type_${wt}`)}
                      </button>
                    ))}
                  </div>

                  {/* Día de la semana — selección única */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                      {t("day_label")}
                    </label>
                    <div className="flex gap-2">
                      {ALL_DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className="flex-1 py-2 rounded-md text-xs font-medium transition-colors"
                          style={{
                            background: selectedDay === day ? "var(--text-primary)" : "var(--surface-elevated)",
                            color: selectedDay === day ? "var(--bg)" : "var(--text-secondary)",
                          }}
                        >
                          {DAY_LETTERS[day - 1]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hora + duración estimada */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                        {t("start_time_label")}
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                        {t("estimated_duration_label")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={estimatedDurationMin}
                        onChange={(e) => setEstimatedDurationMin(e.target.value)}
                        placeholder={t("duration_unit")}
                        className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
                      />
                    </div>
                  </div>

                  {/* Categoría — mismo patrón de pill que Tasks, solo lectura de categorías existentes */}
                  {categories.length > 0 && (
                    <div className="relative self-start">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCatOpen((p) => !p); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: categories.find((c) => c.id === categoryId)?.color ?? "var(--text-muted)" }} />
                        {categories.find((c) => c.id === categoryId)?.name ?? "—"}
                      </button>
                      {catOpen && (
                        <div
                          className="absolute left-0 top-full mt-1 z-10 rounded-lg p-1 min-w-[140px]"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button type="button" onClick={() => { setCategoryId(null); setCatOpen(false); }}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors"
                            style={{ color: !categoryId ? "var(--text-primary)" : "var(--text-secondary)" }}>
                            —
                          </button>
                          {categories.map((cat) => (
                            <button key={cat.id} type="button" onClick={() => { setCategoryId(cat.id); setCatOpen(false); }}
                              className="w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors"
                              style={{ color: categoryId === cat.id ? "var(--text-primary)" : "var(--text-secondary)" }}>
                              {cat.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />}
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ejercicios — reorder vía framer-motion, mismo mecanismo que HabitReorderItem */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                      {t("exercises_label")}
                    </label>

                    {displayExercises.length === 0 ? (
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{t("no_exercises_hint")}</p>
                    ) : (
                      <Reorder.Group as="div" axis="y" values={displayExercises} onReorder={handleReorderExercises} className="flex flex-col gap-1.5 mb-3">
                        {displayExercises.map((ex) => (
                          <ExerciseReorderItem
                            key={ex.id}
                            exercise={ex}
                            onChangeType={(t2) => handleChangeExerciseType(ex.id, t2)}
                            onDelete={() => handleDeleteExercise(ex.id)}
                          />
                        ))}
                      </Reorder.Group>
                    )}

                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <ExerciseCatalogAutocomplete
                          value={newExerciseName}
                          onChange={setNewExerciseName}
                          onSelectSuggestion={(item) => {
                            setNewExerciseName(item.name);
                            if (item.defaultType) setNewExerciseType(item.defaultType);
                          }}
                          searchCatalog={searchCatalog}
                          placeholder={t("exercise_name_placeholder")}
                        />
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={newExerciseSets}
                        onChange={(e) => setNewExerciseSets(e.target.value)}
                        placeholder={t("sets_placeholder")}
                        className="w-24 rounded-md px-3 py-2.5 text-sm outline-none"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
                      />
                      <button
                        type="button"
                        onClick={handleAddExercise}
                        disabled={!newExerciseName.trim()}
                        className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70 disabled:opacity-30"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                        aria-label={t("add_exercise")}
                      >
                        <Plus size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-3 mt-1 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {isEdit && (
                      <button onClick={() => setConfirmDelete(true)} className="p-2.5 rounded-md transition-opacity active:opacity-70"
                        style={{ color: "var(--danger)" }} aria-label={t("delete")}>
                        <Trash2 size={18} />
                      </button>
                    )}
                    <div className="ml-auto">
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-30"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      >
                        {isSaving ? t("saving") : <><Save size={14} />{t("save")}</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
