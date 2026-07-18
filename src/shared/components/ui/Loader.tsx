"use client";

import { motion } from "framer-motion";

interface Props {
  /** Tamaño en px del cuadro completo — escala la forma vía transform,
   *  nunca recalculando a mano los offsets del box-shadow del CSS. */
  size?: number;
  className?: string;
}

/**
 * Loader global reutilizable — efecto "goo" (blobs que se fusionan) vía
 * filter+mix-blend-mode en globals.css (.goo-loader), blanco en tema oscuro
 * / negro en tema claro (reutiliza var(--text-primary), sin color nuevo).
 * Framer-motion solo maneja el fade de entrada/salida — el blob en sí es
 * CSS puro (@keyframes), más eficiente que animarlo por JS.
 */
export function Loader({ size = 48, className = "" }: Props) {
  const scale = size / 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role="status"
      aria-label="Loading"
      className={className}
      style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="goo-loader" style={{ transform: `scale(${scale})` }} />
    </motion.div>
  );
}
