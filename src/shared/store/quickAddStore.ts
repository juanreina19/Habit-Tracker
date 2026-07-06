import { create } from "zustand";

export type QuickAddTarget = "task" | "habit" | null;

interface QuickAddStore {
  target: QuickAddTarget;
  open: (target: "task" | "habit") => void;
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
 */
export const useQuickAddStore = create<QuickAddStore>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));
