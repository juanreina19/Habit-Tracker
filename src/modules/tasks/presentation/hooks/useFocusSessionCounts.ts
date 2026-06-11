"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { FocusSessionSupabaseRepository } from "../../infrastructure/supabase/FocusSessionSupabaseRepository";
import { GetFocusSessionCountsUseCase } from "../../domain/use-cases/GetFocusSessionCountsUseCase";
import { getStartOfLocalDay } from "../lib/focusSessionStorage";
import type { UUID } from "@/shared/types/database.types";

/**
 * Map<taskId, número de sesiones COMPLETADAS hoy>, para el badge "🍅 N" en TaskCard.
 * Si la consulta falla, deja `counts` vacío (Map) sin bloquear el render — el
 * fallback visual es simplemente no mostrar el badge.
 */
export function useFocusSessionCounts(taskIds: UUID[]) {
  const [counts, setCounts] = useState<Map<UUID, number>>(new Map());
  const idsKey = taskIds.join(",");

  useEffect(() => {
    if (!idsKey) { setCounts(new Map()); return; }

    let cancelled = false;
    const repo = new FocusSessionSupabaseRepository(createClient());
    new GetFocusSessionCountsUseCase(repo)
      .execute(idsKey.split(","), getStartOfLocalDay())
      .then((result) => { if (!cancelled) setCounts(result); })
      .catch(() => { if (!cancelled) setCounts(new Map()); });

    return () => { cancelled = true; };
  }, [idsKey]);

  return counts;
}
