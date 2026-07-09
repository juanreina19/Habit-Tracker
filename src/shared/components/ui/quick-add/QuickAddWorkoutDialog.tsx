"use client";

import { useWorkouts } from "@/modules/workouts/presentation/hooks/useWorkouts";
import { WorkoutFormDialog } from "@/modules/workouts/presentation/components/WorkoutFormDialog";
import { useQuickAddStore } from "@/shared/store/quickAddStore";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

/** Solo sabe crear entrenamientos desde el FAB global — no edita ni elimina. */
export function QuickAddWorkoutDialog({ userId }: Props) {
  const { createWorkout } = useWorkouts(userId);
  const dialog = useQuickAddStore((s) => s.dialog);
  const close = useQuickAddStore((s) => s.close);

  return (
    <WorkoutFormDialog
      open={dialog === "workout"}
      onClose={close}
      workout={null}
      userId={userId}
      onCreate={createWorkout}
      onUpdate={async () => {}}
      onDelete={async () => {}}
    />
  );
}
