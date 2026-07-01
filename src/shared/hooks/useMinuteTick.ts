"use client";
import { useEffect } from "react";

export function useMinuteTick(callback: () => void) {
  useEffect(() => {
    const id = setInterval(callback, 60_000);
    return () => clearInterval(id);
  }, [callback]);
}
