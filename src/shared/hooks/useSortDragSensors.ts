"use client";

import { PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * Sensores dnd-kit compartidos por las listas reordenables de la app
 * (Focus Mode y la agenda del dashboard) — misma configuración en ambas,
 * centralizada para que un ajuste de sensibilidad de drag aplique a las dos.
 */
export function useSortDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}
