import type { ISOTimestamp } from "@/shared/types/database.types";

/**
 * Inicio del día actual en hora local, como ISOTimestamp (UTC).
 * DST-safe: usa el constructor local de Date, no aritmética de milisegundos.
 * Reutilizable para futuras metas diarias / estadísticas.
 */
export function getStartOfLocalDay(): ISOTimestamp {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}
