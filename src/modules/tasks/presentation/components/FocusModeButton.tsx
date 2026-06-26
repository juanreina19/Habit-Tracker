"use client";

import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  onClick: () => void;
}

export function FocusModeButton({ onClick }: Props) {
  const t = useTranslations("focus");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("open_picker")}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
      style={{
        background: "var(--surface-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 16px -4px rgba(0,0,0,0.5)",
      }}
    >
      <Zap size={20} strokeWidth={2.5} fill="currentColor" />
    </button>
  );
}
