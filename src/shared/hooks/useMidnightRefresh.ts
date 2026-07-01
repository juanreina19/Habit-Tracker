"use client";

import { useEffect } from "react";

/** Fires `callback` once, exactly at the next local midnight (00:00:00). */
export function useMidnightRefresh(callback: () => void) {
  useEffect(() => {
    const msUntilMidnight = new Date().setHours(24, 0, 0, 0) - Date.now();
    const t = setTimeout(callback, msUntilMidnight);
    return () => clearTimeout(t);
  }, [callback]);
}
