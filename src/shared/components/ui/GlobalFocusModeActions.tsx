"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useFocusMode } from "@/modules/tasks/presentation/hooks/useFocusMode";
import { useTodayTasks } from "@/modules/tasks/presentation/hooks/useTodayTasks";
import { FocusModeButton } from "@/modules/tasks/presentation/components/FocusModeButton";
import { FocusModeTaskPickerDialog } from "@/modules/tasks/presentation/components/FocusModeTaskPickerDialog";
import { FocusModeOverlay } from "@/modules/tasks/presentation/components/FocusModeOverlay";
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

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;
  if (pathname.startsWith("/settings") || pathname.startsWith("/profile")) return null;

  const activeFocus = focusMode.active;

  return (
    <>
      <div className="fixed z-30 right-5 bottom-[calc(env(safe-area-inset-bottom)+160px)] lg:right-8 lg:bottom-[88px]">
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
            tasks={todayTasks.filter((tk) => activeFocus.taskIds.includes(tk.id))}
            toggleTask={toggleTask}
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
