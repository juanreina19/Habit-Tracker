import { create } from "zustand";

export type QuickAddDialog = "task" | "habit" | "workout" | null;

interface QuickAddStore {
  dialog: QuickAddDialog;
  open: (dialog: "task" | "habit" | "workout") => void;
  close: () => void;
}

/**
 * Estado global de "qué diálogo de creación rápida está abierto" — el FAB
 * vive en el layout y es visible en todas las rutas del dashboard, así que
 * este estado es necesariamente compartido entre vistas. Reemplaza el
 * window.dispatchEvent(CustomEvent("quick-add")) anterior: aquel emisor no
 * tenía forma de saber si algún receptor estaba montado, lo que causaba que
 * el FAB no abriera nada en rutas donde no había un listener local. Sin
 * `persist` — es estado efímero de UI, no datos de negocio.
 *
 * "workout" ya está en la unión desde ahora (sin ningún emisor todavía) para
 * no tener que volver a tocar este store y sus dos consumidores cuando el
 * módulo Workouts añada su propia opción de creación rápida en el FAB.
 */
export const useQuickAddStore = create<QuickAddStore>((set) => ({
  dialog: null,
  open: (dialog) => set({ dialog }),
  close: () => set({ dialog: null }),
}));
