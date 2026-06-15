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
      className="fixed z-30 right-5 bottom-[calc(env(safe-area-inset-bottom)+96px)] lg:right-8 lg:bottom-8 w-[54px] h-[54px] rounded-full flex items-center justify-center transition-transform active:scale-95"
      style={{
        background: "#000000",
        color: "#FFFFFF",
        boxShadow: "0 8px 24px -6px rgba(0,0,0,0.45)",
      }}
    >
      <Zap size={24} strokeWidth={2.5} fill="currentColor" />
    </button>
  );
}
