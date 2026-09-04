"use client";

import { useTranslations } from "next-intl";
import { DashboardColumn } from "./DashboardColumn";
import { WorkoutAgendaCard } from "./WorkoutAgendaCard";
import type { WorkoutWithStatus } from "@/modules/workouts/domain/entities/Workout";

interface Props {
  workouts: WorkoutWithStatus[];
  onToggle: (workout: WorkoutWithStatus) => void;
}

export function DashboardWorkoutsColumn({ workouts, onToggle }: Props) {
  const t = useTranslations("dashboard");

  return (
    <DashboardColumn title={t("workouts_title")} count={workouts.length}>
      {workouts.map((workout) => (
        <WorkoutAgendaCard
          key={workout.id}
          workout={workout}
          onToggle={() => onToggle(workout)}
        />
      ))}
    </DashboardColumn>
  );
}
