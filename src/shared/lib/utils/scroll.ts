import type { WheelEvent } from "react";

// Estado de animación por elemento — WeakMap evita fugas de memoria si el
// contenedor se desmonta a mitad de una animación (sin necesidad de cleanup).
const targets = new WeakMap<HTMLDivElement, number>();
const frames = new WeakMap<HTMLDivElement, number>();

/**
 * Convierte el scroll vertical de la rueda del mouse en scroll horizontal,
 * animado con easing (en vez de saltar `scrollLeft` de golpe) para que se
 * sienta suave en vez de tosco. Necesario en contenedores con
 * `overflow-x-auto` + `hide-scrollbar`: en mobile el touch-scroll nativo ya
 * funciona por arrastre, pero en desktop (mouse sin gestos horizontales) no
 * hay forma de activar el scroll sin esto.
 */
export function scrollHorizontallyOnWheel(e: WheelEvent<HTMLDivElement>) {
  if (e.deltaY === 0) return;
  e.preventDefault();

  const el = e.currentTarget;
  const max = el.scrollWidth - el.clientWidth;
  const current = targets.get(el) ?? el.scrollLeft;
  const next = Math.min(Math.max(current + e.deltaY, 0), max);
  targets.set(el, next);

  if (frames.has(el)) return; // ya animando — el siguiente frame toma el target actualizado

  const step = () => {
    const target = targets.get(el);
    if (target === undefined) { frames.delete(el); return; }
    const diff = target - el.scrollLeft;
    if (Math.abs(diff) < 0.5) {
      el.scrollLeft = target;
      targets.delete(el);
      frames.delete(el);
      return;
    }
    el.scrollLeft += diff * 0.2;
    frames.set(el, requestAnimationFrame(step));
  };
  frames.set(el, requestAnimationFrame(step));
}
