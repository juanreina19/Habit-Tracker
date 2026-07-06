"use client";

import { useTasks } from "@/modules/tasks/presentation/hooks/useTasks";
import { TaskFormDialog } from "@/modules/tasks/presentation/components/TaskFormDialog";
import { useQuickAddStore } from "@/shared/store/quickAddStore";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

/** Solo sabe crear tareas desde el FAB global — no edita ni elimina. */
export function QuickAddTaskDialog({ userId }: Props) {
  const { createTask } = useTasks(userId);
  const target = useQuickAddStore((s) => s.target);
  const close = useQuickAddStore((s) => s.close);

  return (
    <TaskFormDialog
      open={target === "task"}
      onClose={close}
      task={null}
      userId={userId}
      onCreate={createTask}
      onUpdate={async () => {}}
      onDelete={async () => {}}
    />
  );
}
