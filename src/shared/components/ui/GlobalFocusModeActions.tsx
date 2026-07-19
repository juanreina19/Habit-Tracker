"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useFocusMode } from "@/modules/tasks/presentation/hooks/useFocusMode";
import { useTodayTasks } from "@/modules/tasks/presentation/hooks/useTodayTasks";
import { FocusModeButton } from "@/modules/tasks/presentation/components/FocusModeButton";
import { FocusModeTaskPickerDialog } from "@/modules/tasks/presentation/components/FocusModeTaskPickerDialog";
import { FocusModeOverlay } from "@/modules/tasks/presentation/components/FocusModeOverlay";
import type { TaskWithStatus } from "@/modules/tasks/domain/entities/Task";
import type { UUID } from "@/shared/types/database.types";

interface Props {
  userId: UUID;
}

export function GlobalFocusModeActions({ userId }: Props) {
  const pathname = usePathname();
  const focusMode = useFocusMode(userId);
  const { tasks: todayTasks, toggleTask } = useTodayTasks(userId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const activeFocus = focusMode.active;

  // Snapshot propio de las tareas de la sesión: `useTodayTasks.toggleTask` quita del array
  // a las tareas atrasadas al completarlas (correcto para la vista "Hoy", donde no deben
  // seguir apareciendo) — si el overlay derivara `tasks` en vivo de `todayTasks`, completar
  // una tarea atrasada durante el flujo la haría desaparecer también de la sesión activa.
  // Se siembra una sola vez por sesión (clave `clientSessionId`) y luego se actualiza solo
  // localmente vía `handleToggleTask`, sin volver a derivarse de `todayTasks`.
  const [sessionTasks, setSessionTasks] = useState<TaskWithStatus[]>([]);
  const seededSessionId = useRef<UUID | null>(null);

  useEffect(() => {
    if (!activeFocus) { seededSessionId.current = null; return; }
    if (seededSessionId.current === activeFocus.clientSessionId) return;
    if (todayTasks.length === 0) return;
    seededSessionId.current = activeFocus.clientSessionId;
    setSessionTasks(todayTasks.filter((tk) => activeFocus.taskIds.includes(tk.id)));
  }, [activeFocus, todayTasks]);

  const handleToggleTask = (task: TaskWithStatus) => {
    setSessionTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isCompletedToday: !t.isCompletedToday } : t))
    );
    toggleTask(task);
  };

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;
  if (pathname.startsWith("/settings") || pathname.startsWith("/profile")) return null;

  return (
    <>
      <div className="fixed z-30 right-5 lg:right-8" style={{ bottom: "var(--focus-button-offset)" }}>
        <FocusModeButton onClick={() => {
          if (activeFocus) setOverlayOpen(true);
          else setPickerOpen(true);
        }} />
      </div>

      <FocusModeTaskPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        onStart={(taskIds, durationMin) => {
          focusMode.start(taskIds, { focusDurationMin: durationMin });
          setOverlayOpen(true);
        }}
      />

      <AnimatePresence>
        {activeFocus && overlayOpen && (
          <FocusModeOverlay
            key="focus-overlay"
            session={activeFocus}
            tasks={sessionTasks}
            toggleTask={handleToggleTask}
            onPause={focusMode.pause}
            onResume={focusMode.resume}
            onSkip={focusMode.advancePhase}
            onClose={() => setOverlayOpen(false)}
            onEndSession={() => {
              focusMode.discard();
              setOverlayOpen(false);
            }}
            onUpdateConfig={focusMode.updateActiveConfig}
            onReset={focusMode.resetTimer}
          />
        )}
      </AnimatePresence>
    </>
  );
}
