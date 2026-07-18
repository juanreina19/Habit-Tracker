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
        background: "#000000",
        color: "#FFFFFF",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <Zap size={20} strokeWidth={2} fill="currentColor" />
    </button>
  );
}
