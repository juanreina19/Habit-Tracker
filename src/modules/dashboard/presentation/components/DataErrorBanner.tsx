"use client";

import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

interface Props {
  onRetry: () => void;
}

export function DataErrorBanner({ onRetry }: Props) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg glass-panel">
      <AlertCircle size={16} style={{ color: "var(--danger)" }} className="flex-shrink-0" />
      <p className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>
        {t("data_error")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-semibold px-3 py-1.5 rounded-md transition-opacity active:opacity-70 flex-shrink-0"
        style={{ color: "var(--danger)", background: "rgba(239,68,68,0.1)" }}
      >
        {t("retry")}
      </button>
    </div>
  );
}
