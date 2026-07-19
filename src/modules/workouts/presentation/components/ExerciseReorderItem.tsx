"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { GripVertical, ChevronDown, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipProvider } from "@/shared/components/ui/Tooltip";
import { EXERCISE_TYPE_COLORS } from "../constants/workoutColors";
import { DEFAULT_EXERCISE_REPS } from "../../domain/entities/WorkoutExercise";
import type { ExerciseType } from "../../domain/entities/WorkoutExercise";

/** Borrador de ejercicio dentro del formulario — id temporal (crypto.randomUUID())
 *  mientras el workout todavía no existe, o el id real una vez persistido. */
export interface ExerciseDraft {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  notes: string | null;
}

interface Props {
  exercise: ExerciseDraft;
  onChangeType: (type: ExerciseType) => void;
  onChangeSets: (sets: number | null) => void;
  onChangeReps: (reps: number | null) => void;
  onChangeDuration: (durationSec: number | null) => void;
  onDelete: () => void;
}

const DEFAULT_DURATION_SEC = 30;

/**
 * Card colapsable y reordenable de un ejercicio dentro de WorkoutFormDialog
 * — el flujo de creación solo pide el nombre (defaults 3x10 ya aplicados
 * por CreateWorkoutExerciseUseCase); esta card deja editar series/reps/tipo
 * expandiéndola. Reorder vía framer-motion Reorder + dragControls, mismo
 * mecanismo que HabitReorderItem (HabitsView.tsx) y el drag ya corregido de
 * EnfoqueTab — no dnd-kit (evita reintroducir el bug de "hay que sostener"
 * en móvil).
 *
 * Sets/reps/duración usan un buffer local que solo confirma el cambio real
 * (onChangeX) al perder foco o presionar Enter — evita escribir a Supabase
 * en cada tecla. El tipo (fuerza/cardio) sigue siendo instantáneo al click,
 * no necesita confirmación.
 */
export function ExerciseReorderItem({ exercise, onChangeType, onChangeSets, onChangeReps, onChangeDuration, onDelete }: Props) {
  const t = useTranslations("workouts");
  const dragControls = useDragControls();
  const [expanded, setExpanded] = useState(false);

  // El modo se infiere de cuál campo está poblado, no hay un flag de modo
  // separado que se pueda desincronizar.
  const isTimeMode = exercise.durationSec != null;

  const [setsInput, setSetsInput] = useState(String(exercise.sets ?? ""));
  const [repsInput, setRepsInput] = useState(String(exercise.reps ?? ""));
  const [durationInput, setDurationInput] = useState(String(exercise.durationSec ?? ""));

  // Se resincroniza al abrir la card Y al alternar de modo (Reps<->Tiempo) —
  // sin esto último, el input que aparece tras cambiar de modo mostraba el
  // buffer viejo/vacío hasta la próxima vez que se cerraba y abría la card.
  // Deliberadamente NO depende de exercise.sets/reps/durationSec en general
  // (eso sobrescribiría lo que el usuario está escribiendo mid-edit).
  useEffect(() => {
    if (!expanded) return;
    setSetsInput(String(exercise.sets ?? ""));
    setRepsInput(String(exercise.reps ?? ""));
    setDurationInput(String(exercise.durationSec ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, isTimeMode]);

  const commitSets = () => onChangeSets(setsInput.trim() ? Number(setsInput) : null);
  const commitReps = () => onChangeReps(repsInput.trim() ? Number(repsInput) : null);
  const commitDuration = () => onChangeDuration(durationInput.trim() ? Number(durationInput) : null);

  const switchToReps = () => {
    onChangeDuration(null);
    onChangeReps(exercise.reps ?? DEFAULT_EXERCISE_REPS);
  };
  const switchToTime = () => {
    onChangeReps(null);
    onChangeDuration(exercise.durationSec ?? DEFAULT_DURATION_SEC);
  };

  const subtitle = isTimeMode
    ? exercise.sets && exercise.sets > 1
      ? `${exercise.sets} ${t("sets_label").toLowerCase()} x ${exercise.durationSec} ${t("seconds_short")}`
      : `${exercise.durationSec} ${t("seconds_short")}`
    : exercise.sets && exercise.reps
      ? `${exercise.sets} ${t("sets_label").toLowerCase()} x ${exercise.reps} ${t("reps_short")}`
      : null;

  return (
    <Reorder.Item
      as="div"
      value={exercise}
      dragControls={dragControls}
      dragListener={false}
      className="flex items-center gap-2"
    >
      <div className="flex-1 min-w-0 rounded-md glass-panel">
        <div className="flex items-center gap-2.5 p-2.5">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex-shrink-0 self-start mt-0.5 transition-transform"
            style={{ color: "var(--text-muted)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-label={t("exercise_name_placeholder")}
          >
            <ChevronDown size={14} strokeWidth={2} />
          </button>

          <button type="button" onClick={() => setExpanded((p) => !p)} className="flex-1 min-w-0 text-left">
            <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{exercise.name}</p>
            {subtitle && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
          </button>

          <span className="text-[10px] uppercase tracking-wide flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {exercise.type === "strength" ? t("type_strength") : t("type_cardio")}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex flex-col gap-1.5">
                  {/* Modo Reps / Tiempo — texto plano, sin caja */}
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
                    <button type="button" onClick={switchToReps} style={{ color: !isTimeMode ? "var(--text-primary)" : "var(--text-muted-darker)" }}>
                      {t("mode_reps")}
                    </button>
                    <span style={{ color: "var(--text-muted-darker)" }}>·</span>
                    <button type="button" onClick={switchToTime} style={{ color: isTimeMode ? "var(--text-primary)" : "var(--text-muted-darker)" }}>
                      {t("mode_time")}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t("sets_label")}</span>
                      <input
                        type="number"
                        min={1}
                        value={setsInput}
                        onChange={(e) => setSetsInput(e.target.value)}
                        onBlur={commitSets}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") { setSetsInput(String(exercise.sets ?? "")); (e.target as HTMLInputElement).blur(); }
                        }}
                        className="w-8 text-sm text-center outline-none bg-transparent"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </div>
                    <span style={{ color: "var(--text-muted-darker)" }}>x</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{isTimeMode ? t("duration_label") : t("reps_label")}</span>
                      {isTimeMode ? (
                        <input
                          type="number"
                          min={1}
                          value={durationInput}
                          onChange={(e) => setDurationInput(e.target.value)}
                          onBlur={commitDuration}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") { setDurationInput(String(exercise.durationSec ?? "")); (e.target as HTMLInputElement).blur(); }
                          }}
                          className="w-8 text-sm text-center outline-none bg-transparent"
                          style={{ color: "var(--text-primary)" }}
                        />
                      ) : (
                        <input
                          type="number"
                          min={1}
                          value={repsInput}
                          onChange={(e) => setRepsInput(e.target.value)}
                          onBlur={commitReps}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") { setRepsInput(String(exercise.reps ?? "")); (e.target as HTMLInputElement).blur(); }
                          }}
                          className="w-8 text-sm text-center outline-none bg-transparent"
                          style={{ color: "var(--text-primary)" }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <TooltipProvider>
                    <div className="flex gap-1.5">
                      <Tooltip label={t("type_strength")} side="top">
                        <button
                          type="button"
                          onClick={() => onChangeType("strength")}
                          className="w-2.5 h-2.5 rounded-full transition-transform"
                          style={{
                            background: EXERCISE_TYPE_COLORS.strength,
                            opacity: exercise.type === "strength" ? 1 : 0.25,
                            transform: exercise.type === "strength" ? "scale(1.2)" : "scale(1)",
                          }}
                          aria-label={t("type_strength")}
                        />
                      </Tooltip>
                      <Tooltip label={t("type_cardio")} side="top">
                        <button
                          type="button"
                          onClick={() => onChangeType("cardio")}
                          className="w-2.5 h-2.5 rounded-full transition-transform"
                          style={{
                            background: EXERCISE_TYPE_COLORS.cardio,
                            opacity: exercise.type === "cardio" ? 1 : 0.25,
                            transform: exercise.type === "cardio" ? "scale(1.2)" : "scale(1)",
                          }}
                          aria-label={t("type_cardio")}
                        />
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="transition-opacity active:opacity-60"
                    style={{ color: "var(--danger)" }}
                    aria-label={t("delete")}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: "var(--text-muted)" }}
      >
        <GripVertical size={16} strokeWidth={2} />
      </div>
    </Reorder.Item>
  );
}
