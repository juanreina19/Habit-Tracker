"use client";

import { useState } from "react";
import WeeklyView from "./WeeklyView";
import MonthlyView from "./MonthlyView";
import type { UUID } from "@/shared/types/database.types";

type Mode = "weekly" | "monthly";

interface Props {
  userId: UUID;
  userCreatedAt?: string;
}

export default function CalendarView({ userId, userCreatedAt }: Props) {
  const [mode, setMode] = useState<Mode>("weekly");

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Vista</p>
          <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
            Calendario
          </h1>
        </div>
        <div className="flex rounded-[12px] p-1" style={{ background: "var(--surface)" }}>
          {(["weekly", "monthly"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-2 rounded-[9px] text-sm font-medium transition-all"
              style={{
                background: mode === m ? "var(--surface-elevated)" : "transparent",
                color: mode === m ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {m === "weekly" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {mode === "weekly"
        ? <WeeklyView userId={userId} userCreatedAt={userCreatedAt} embedded />
        : <MonthlyView userId={userId} userCreatedAt={userCreatedAt} embedded />
      }
    </div>
  );
}
