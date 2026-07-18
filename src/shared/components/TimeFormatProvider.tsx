"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type TimeFormat = "12h" | "24h";

interface TimeFormatCtx {
  format: TimeFormat;
  setFormat: (format: TimeFormat) => void;
}

const TimeFormatContext = createContext<TimeFormatCtx>({ format: "12h", setFormat: () => {} });

export function useTimeFormat() {
  return useContext(TimeFormatContext);
}

/** Preferencia de formato de hora (12h "9:00 PM" / 24h "21:00") — mismo
 *  patrón de persistencia que ThemeProvider (localStorage, sin backend),
 *  solo afecta el texto mostrado vía formatTaskTime, no los <input
 *  type="time"> nativos (su formato lo controla el SO/navegador). */
export function TimeFormatProvider({ children }: { children: React.ReactNode }) {
  const [format, setFormatState] = useState<TimeFormat>("12h");

  useEffect(() => {
    const stored = localStorage.getItem("timeFormat") as TimeFormat | null;
    if (stored === "24h") setFormatState("24h");
  }, []);

  const setFormat = (next: TimeFormat) => {
    setFormatState(next);
    localStorage.setItem("timeFormat", next);
  };

  return (
    <TimeFormatContext.Provider value={{ format, setFormat }}>
      {children}
    </TimeFormatContext.Provider>
  );
}
