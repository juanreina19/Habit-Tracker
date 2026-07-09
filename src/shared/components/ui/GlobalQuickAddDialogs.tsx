"use client";

import { QuickAddTaskDialog } from "./quick-add/QuickAddTaskDialog";
import { QuickAddHabitDialog } from "./quick-add/QuickAddHabitDialog";
import { QuickAddWorkoutDialog } from "./quick-add/QuickAddWorkoutDialog";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

/**
 * Raíz de composición montada globalmente en el layout (mismo rol que
 * GlobalFocusModeActions), sin lógica propia — delega en los diálogos
 * hijos, cada uno responsable de un solo tipo de creación rápida.
 */
export function GlobalQuickAddDialogs({ userId }: Props) {
  return (
    <>
      <QuickAddTaskDialog userId={userId} />
      <QuickAddHabitDialog userId={userId} />
      <QuickAddWorkoutDialog userId={userId} />
    </>
  );
}
