"use client";

import { useSettingsHabits } from "@/modules/habits/presentation/hooks/useSettingsHabits";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { HabitFormDialog } from "@/modules/habits/presentation/components/settings/HabitFormDialog";
import { useQuickAddStore } from "@/shared/store/quickAddStore";
import type { CreateHabitInput } from "@/modules/habits/domain/repositories/IHabitRepository";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

/** Solo sabe crear hábitos desde el FAB global — no edita ni elimina. */
export function QuickAddHabitDialog({ userId }: Props) {
  const { create } = useSettingsHabits(userId);
  const { categories } = useCategories(userId);
  const dialog = useQuickAddStore((s) => s.dialog);
  const close = useQuickAddStore((s) => s.close);

  return (
    <HabitFormDialog
      open={dialog === "habit"}
      onClose={close}
      habit={null}
      categories={categories}
      onSave={async (data) => { await create(data as CreateHabitInput); }}
    />
  );
}
