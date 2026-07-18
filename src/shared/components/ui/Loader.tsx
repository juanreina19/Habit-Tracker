"use client";

import { motion } from "framer-motion";

interface Props {
  /** Tamaño en px del cuadro completo. */
  size?: number;
  /** Color del anillo — default var(--text-primary) (blanco en oscuro /
   *  negro en claro). Override solo para contextos sobre un fondo de color
   *  fijo (ej. un toggle verde) donde ese contraste automático no aplica. */
  color?: string;
  className?: string;
}

const RINGS = [0, 1, 2];

/**
 * Loader global reutilizable — efecto "ripple" (anillos concéntricos que se
 * expanden y desvanecen en loop), 100% framer-motion. Blanco en tema oscuro
 * / negro en tema claro (reutiliza var(--text-primary), sin color nuevo).
 *
 * Estándar para cargas SECUNDARIAS / en-contexto (ej. una pestaña, una
 * lista de subtareas) — no para el skeleton de página completa de una
 * vista: esos ya simulan el layout real con `skeleton-shimmer` y se quedan
 * como están (mejor UX de "layout ya conocido" que un spinner genérico).
 */
export function Loader({ size = 48, color = "var(--text-primary)", className = "" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role="status"
      aria-label="Loading"
      className={className}
      style={{ width: size, height: size, position: "relative" }}
    >
      {RINGS.map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${color}` }}
          initial={{ opacity: 0.6, scale: 0.2 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: i * 0.45 }}
        />
      ))}
    </motion.div>
  );
}
