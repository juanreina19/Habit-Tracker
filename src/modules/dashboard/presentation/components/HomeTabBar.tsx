"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export type HomeTab = "focus" | "board" | "eisenhower" | "kanban";

const TABS: HomeTab[] = ["focus", "board", "eisenhower", "kanban"];

const TAB_KEYS: Record<HomeTab, string> = {
  focus: "tab_focus",
  board: "tab_board",
  eisenhower: "tab_eisenhower",
  kanban: "tab_kanban",
};

interface Props {
  active: HomeTab;
  onChange: (tab: HomeTab) => void;
}

export function HomeTabBar({ active, onChange }: Props) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex items-center justify-center gap-1">
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className="relative px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            {t(TAB_KEYS[tab] as Parameters<typeof t>[0])}
            {isActive && (
              <motion.div
                layoutId="home-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ background: "var(--accent)" }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
