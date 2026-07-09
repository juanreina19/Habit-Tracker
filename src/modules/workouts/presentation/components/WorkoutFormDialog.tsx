"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { X, Trash2, Dumbbell, Zap, BookmarkCheck, Save } from "lucide-react";
import { useWorkoutExercises } from "../hooks/useWorkoutExercises";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { ExerciseReorderItem, type ExerciseDraft } from "./ExerciseReorderItem";
import { SavedExercisesPicker } from "./SavedExercisesPicker";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import type { Workout, CreateWorkoutInput, UpdateWorkoutInput } from "../../domain/entities/Workout";
import type { ExerciseType } from "../../domain/entities/WorkoutExercise";
import type { UUID } from "@/shared/types/database.types";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
type AddMode = "strength" | "cardio" | "saved";

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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const [nameError, setNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [addMode, setAddMode] = useState<AddMode>("strength");
  const [newExerciseName, setNewExerciseName] = useState("");
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
    setSelectedDay(workout?.dayOfWeek ?? null);
    setStartTime(workout?.startTime?.slice(0, 5) ?? "");
    setCategoryId(workout?.categoryId ?? null);
    setNameError("");
    setIsSaving(false);
    setIsDeleting(false);
    setConfirmDelete(false);
    setAddMode("strength");
    setNewExerciseName("");
    setLocalExercises([]);
    setCatOpen(false);
    setDayPickerOpen(false);
    setTimePickerOpen(false);
  }, [open, workout]);

  const displayExercises: ExerciseDraft[] = isEdit
    ? exercises.map((e) => ({ id: e.id, name: e.name, type: e.type, sets: e.sets, reps: e.reps, notes: e.notes }))
    : localExercises;

  const handleAddExercise = async () => {
    const value = newExerciseName.trim();
    if (!value) return;
    const type: ExerciseType = addMode === "cardio" ? "cardio" : "strength";

    if (isEdit && workout) {
      await createExercise({ workoutId: workout.id, name: value, type });
    } else {
      setLocalExercises((prev) => [...prev, { id: crypto.randomUUID(), name: value, type, sets: null, reps: null, notes: null }]);
    }
    setNewExerciseName("");
  };

  const handleSelectSaved = async (item: { id: UUID; name: string; defaultType: ExerciseType | null }) => {
    const type = item.defaultType ?? "strength";
    if (isEdit && workout) {
      await createExercise({ workoutId: workout.id, catalogExerciseId: item.id, name: item.name, type });
    } else {
      setLocalExercises((prev) => [...prev, { id: crypto.randomUUID(), name: item.name, type, sets: null, reps: null, notes: null }]);
    }
  };

  const handleDeleteExercise = (id: string) => {
    if (isEdit) deleteExercise(id);
    else setLocalExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleChangeExerciseType = (id: string, nextType: ExerciseType) => {
    if (isEdit) updateExercise(id, { type: nextType });
    else setLocalExercises((prev) => prev.map((e) => (e.id === id ? { ...e, type: nextType } : e)));
  };

  const handleChangeExerciseSets = (id: string, sets: number | null) => {
    if (isEdit) updateExercise(id, { sets });
    else setLocalExercises((prev) => prev.map((e) => (e.id === id ? { ...e, sets } : e)));
  };

  const handleChangeExerciseReps = (id: string, reps: number | null) => {
    if (isEdit) updateExercise(id, { reps });
    else setLocalExercises((prev) => prev.map((e) => (e.id === id ? { ...e, reps } : e)));
  };

  const handleReorderExercises = (next: ExerciseDraft[]) => {
    if (isEdit) {
      const byId = new Map(exercises.map((e) => [e.id, e]));
      reorderExercises(next.map((d) => byId.get(d.id)).filter((e): e is typeof exercises[number] => !!e));
    } else {
      setLocalExercises(next);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("workout_name")); return; }

    setIsSaving(true);
    try {
      const commonInput = {
        name: trimmed,
        dayOfWeek: selectedDay,
        startTime: startTime || null,
        categoryId: categoryId ?? null,
      };

      if (isEdit && workout) {
        await onUpdate(workout.id, commonInput);
      } else {
        const created = await onCreate(commonInput);
        if (created) {
          for (const ex of localExercises) {
            await createExercise({ workoutId: created.id, name: ex.name, type: ex.type, sets: ex.sets, reps: ex.reps, notes: ex.notes });
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

  const dayPillLabel = selectedDay ? DAY_LETTERS[selectedDay - 1] : t("any_day");
  const timePillLabel = startTime || t("time_free");

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
          style={{ background: "var(--bg)", border: "1px solid var(--border)", maxHeight: "90dvh" }}
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
                      className="flex-1 py-3 rounded-md text-sm transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
                      {t("cancel")}
                    </button>
                    <button onClick={handleDelete} disabled={isDeleting}
                      className="flex-1 py-3 rounded-md text-sm transition-opacity active:opacity-70 disabled:opacity-50"
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
                      onKeyDown={(e) => { if (e.key === "Enter" && !isEdit && name.trim()) { e.preventDefault(); handleSave(); } }}
                      placeholder={t("workout_name_placeholder")}
                      autoFocus
                      className="w-full text-2xl font-normal outline-none bg-transparent"
                      style={{ color: "var(--text-primary)" }}
                    />
                    {nameError && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{nameError}</p>}
                  </div>

                  {/* Modo de agregar ejercicio — Fuerza / Cardio / Guardados */}
                  <div className="flex gap-2">
                    {([
                      { mode: "strength" as const, Icon: Dumbbell, label: t("type_strength") },
                      { mode: "cardio" as const, Icon: Zap, label: t("type_cardio") },
                      { mode: "saved" as const, Icon: BookmarkCheck, label: t("saved_label") },
                    ]).map(({ mode, Icon, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAddMode(mode)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs transition-colors"
                        style={{
                          background: addMode === mode ? "var(--text-primary)" : "var(--surface-elevated)",
                          color: addMode === mode ? "var(--bg)" : "var(--text-secondary)",
                        }}
                      >
                        <Icon size={13} strokeWidth={2} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Agregar ejercicio — solo pide el nombre; series/reps quedan con
                      defaults (3x10), editables luego desde la card colapsable. */}
                  {addMode === "saved" ? (
                    <SavedExercisesPicker searchCatalog={searchCatalog} onSelect={handleSelectSaved} />
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExercise(); } }}
                        placeholder={t("add_exercise_placeholder")}
                        className="flex-1 rounded-md px-3 py-2.5 text-sm outline-none"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid transparent" }}
                      />
                    </div>
                  )}

                  {/* Ejercicios agregados — reorder vía framer-motion, mismo mecanismo que HabitReorderItem */}
                  {displayExercises.length > 0 && (
                    <Reorder.Group as="div" axis="y" values={displayExercises} onReorder={handleReorderExercises} className="flex flex-col gap-1.5">
                      {displayExercises.map((ex) => (
                        <ExerciseReorderItem
                          key={ex.id}
                          exercise={ex}
                          onChangeType={(t2) => handleChangeExerciseType(ex.id, t2)}
                          onChangeSets={(sets) => handleChangeExerciseSets(ex.id, sets)}
                          onChangeReps={(reps) => handleChangeExerciseReps(ex.id, reps)}
                          onDelete={() => handleDeleteExercise(ex.id)}
                        />
                      ))}
                    </Reorder.Group>
                  )}

                  {/* Metadata — pills estilo Tasks: DÍAS, HORA, Categoría */}
                  <div className="flex flex-wrap gap-1.5 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDayPickerOpen((p) => !p); setTimePickerOpen(false); setCatOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-colors"
                        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: selectedDay ? "var(--accent)" : "var(--text-muted)" }} />
                        <span style={{ color: "var(--text-muted)" }}>{t("day_label").toUpperCase()}</span>
                        {dayPillLabel}
                      </button>
                      {dayPickerOpen && (
                        <div
                          className="absolute left-0 top-full mt-1 z-10 rounded-lg p-2 flex gap-1"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ALL_DAYS.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleSelectDay(day)}
                              className="w-7 h-7 rounded-md text-xs transition-colors"
                              style={{
                                background: selectedDay === day ? "var(--text-primary)" : "transparent",
                                color: selectedDay === day ? "var(--bg)" : "var(--text-secondary)",
                              }}
                            >
                              {DAY_LETTERS[day - 1]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTimePickerOpen((p) => !p); setDayPickerOpen(false); setCatOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-colors"
                        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: startTime ? "var(--accent)" : "var(--text-muted)" }} />
                        <span style={{ color: "var(--text-muted)" }}>{t("start_time_label").toUpperCase()}</span>
                        {timePillLabel}
                      </button>
                      {timePickerOpen && (
                        <div
                          className="absolute left-0 top-full mt-1 z-10 rounded-lg p-2"
                          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="rounded-md px-2 py-1.5 text-sm outline-none"
                            style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                          />
                        </div>
                      )}
                    </div>

                    {categories.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCatOpen((p) => !p); setDayPickerOpen(false); setTimePickerOpen(false); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-colors"
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
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-3 mt-1 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {isEdit && (
                      <button onClick={() => setConfirmDelete(true)} className="p-2.5 rounded-md transition-opacity active:opacity-70"
                        style={{ color: "var(--danger)" }} aria-label={t("delete")}>
                        <Trash2 size={18} />
                      </button>
                    )}
                    {!isEdit && (
                      <p className="flex-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        {t("save_hint_prefix")}{" "}<span style={{ color: "var(--text-primary)" }}>Enter</span>{" "}{t("save_hint_suffix")}
                      </p>
                    )}
                    <div className="ml-auto">
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm transition-opacity active:opacity-70 disabled:opacity-30"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      >
                        {isSaving ? t("saving") : <>{t("save")} →</>}
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
