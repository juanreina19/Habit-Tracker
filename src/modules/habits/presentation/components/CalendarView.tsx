"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("calendar");

  return (
    <div className="px-5 pt-14 pb-6 lg:pt-8 lg:px-10">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("subtitle")}</p>
          <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h1>
        </div>
        <div className="flex rounded-md p-1" style={{ background: "var(--surface)" }}>
          {(["weekly", "monthly"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                background: mode === m ? "var(--surface-elevated)" : "transparent",
                color: mode === m ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {m === "weekly" ? t("mode_weekly") : t("mode_monthly")}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {mode === "weekly"
          ? <WeeklyView userId={userId} userCreatedAt={userCreatedAt} embedded />
          : <MonthlyView userId={userId} userCreatedAt={userCreatedAt} embedded />
        }
      </motion.div>
    </div>
  );
}
