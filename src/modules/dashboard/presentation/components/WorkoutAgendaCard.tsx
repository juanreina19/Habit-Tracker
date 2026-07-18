"use client";

import { useTranslations } from "next-intl";
import { Dumbbell } from "lucide-react";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "@/modules/tasks/presentation/components/TaskCheckbox";
import type { WorkoutWithStatus } from "@/modules/workouts/domain/entities/Workout";
import type { WorkoutExercise } from "@/modules/workouts/domain/entities/WorkoutExercise";

interface Props {
  workout: WorkoutWithStatus;
  onToggle: () => void;
}

function exerciseAmount(ex: Pick<WorkoutExercise, "sets" | "reps" | "durationSec">, t: (key: string) => string): string | null {
  if (ex.durationSec != null) {
    return ex.sets && ex.sets > 1
      ? `${ex.sets} x ${ex.durationSec} ${t("seconds_short")}`
      : `${ex.durationSec} ${t("seconds_short")}`;
  }
  return ex.sets && ex.reps ? `${ex.sets} x ${ex.reps}` : null;
}

/**
 * Card del workout de hoy en la Agenda de Inicio/Enfoque — mismo shell que
 * TaskCardDashboard.tsx (rounded-md p-2.5, card-border-hover, bg+borde
 * condicional a "done"), único lugar donde un workout puede marcarse
 * completo: el guard isToday que ya protege tasks/habits en EnfoqueTab.tsx
 * cubre también esto, evitando el bug de /workouts (se podía "marcar" un
 * día que no era hoy). Ejercicios en una sola línea por ítem, ícono de
 * mancuerna + "nombre · cantidad", todo en gris apagado y una fuente más
 * chica que el resto de la card.
 */
export function WorkoutAgendaCard({ workout, onToggle }: Props) {
  const t = useTranslations("workouts");
  const done = workout.isCompletedToday;

  return (
    <div
      className="rounded-md p-2.5 card-border-hover"
      style={{
        background: "var(--bg)",
        border: done ? "1px solid transparent" : "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        <TaskCheckbox done={done} size={TASK_CHECKBOX_SIZE.card} animated onToggle={onToggle} ariaLabel={workout.name} />
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-normal truncate block"
            style={{
              color: done ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {workout.name}
          </span>
        </div>
      </div>

      {workout.exercises.length > 0 && !done && (
        <div className="flex flex-col gap-1 mt-2 pl-7">
          {workout.exercises.map((ex) => {
            const amount = exerciseAmount(ex, t);
            return (
              <div key={ex.id} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <Dumbbell size={11} strokeWidth={2} className="flex-shrink-0" />
                <span className="truncate">
                  {ex.name}
                  {amount && <> · {amount}</>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
