"use client";

import { useTranslations } from "next-intl";
import { TaskCheckbox, TASK_CHECKBOX_SIZE } from "@/modules/tasks/presentation/components/TaskCheckbox";
import { ExerciseRow } from "@/modules/workouts/presentation/components/ExerciseRow";
import type { WorkoutWithStatus } from "@/modules/workouts/domain/entities/Workout";

interface Props {
  workout: WorkoutWithStatus;
  onToggle: () => void;
}

/**
 * Card del workout de hoy en la Agenda de Inicio/Enfoque — mismo shell que
 * TaskCardDashboard.tsx (rounded-md p-2.5, card-border-hover, bg+borde
 * condicional a "done"), único lugar donde un workout puede marcarse
 * completo: el guard isToday que ya protege tasks/habits en EnfoqueTab.tsx
 * cubre también esto, evitando el bug de /workouts (se podía "marcar" un
 * día que no era hoy).
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
          {!done && (
            <span className="text-[10px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
              {t("title")}
            </span>
          )}
        </div>
      </div>

      {workout.exercises.length > 0 && !done && (
        <div className="flex flex-col gap-1 mt-2 pl-7">
          {workout.exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} />
          ))}
        </div>
      )}
    </div>
  );
}
