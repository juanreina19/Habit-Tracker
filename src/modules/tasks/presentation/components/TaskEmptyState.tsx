"use client";

import { useTranslations } from "next-intl";

interface Props {
  variant?: "tasks" | "today";
}

export function TaskEmptyState({ variant = "tasks" }: Props) {
  const t = useTranslations("tasks");

  if (variant === "today") {
    return (
      <div className="py-4 text-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("all_done_hint")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-8 text-center" style={{ background: "var(--surface)" }}>
      <p className="text-4xl mb-3">✅</p>
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{t("no_tasks")}</p>
      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{t("no_tasks_hint")}</p>
    </div>
  );
}
