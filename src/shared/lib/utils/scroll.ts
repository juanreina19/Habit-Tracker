import type { WheelEvent } from "react";

/**
 * Convierte el scroll vertical de la rueda del mouse en scroll horizontal.
 * Necesario en contenedores con `overflow-x-auto` + `hide-scrollbar`: en
 * mobile el touch-scroll nativo ya funciona por arrastre, pero en desktop
 * (mouse sin gestos horizontales) no hay forma de activar el scroll sin esto.
 */
export function scrollHorizontallyOnWheel(e: WheelEvent<HTMLDivElement>) {
  if (e.deltaY === 0) return;
  e.currentTarget.scrollLeft += e.deltaY;
  e.preventDefault();
}
