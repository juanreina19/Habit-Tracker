"use client";

import { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { FocusModeSession } from "../../domain/entities/FocusModeSession";
import type { FocusModeSettingsInput } from "../hooks/useFocusMode";

interface Props {
  open: boolean;
  onClose: () => void;
  session: FocusModeSession;
  onSave: (patch: FocusModeSettingsInput) => void;
}

const RANGES = {
  focusDurationMin: { min: 1, max: 480 },
  shortBreakMin: { min: 1, max: 60 },
  longBreakMin: { min: 1, max: 120 },
  longBreakInterval: { min: 1, max: 12 },
} satisfies Record<string, { min: number; max: number }>;

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md px-3 py-3 text-sm outline-none"
          style={{
            background: "var(--surface-elevated)",
            color: "var(--text-primary)",
            border: "1.5px solid transparent",
            WebkitAppearance: "none",
            appearance: "none",
          }}
        />
        {unit && (
          <span className="text-xs flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={text}
        className="flex items-center justify-center"
        style={{ color: "var(--text-secondary)" }}
      >
        <Info size={14} strokeWidth={2} />
      </button>
      {open && (
        <span
          className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-2 w-48 rounded-md p-2 text-center text-xs font-normal normal-case shadow-lg"
          style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={label}
      aria-pressed={checked}
      className="flex-shrink-0 w-12 h-7 rounded-full relative transition-colors"
      style={{ background: checked ? "#4CAF82" : "var(--border)" }}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: checked ? "calc(100% - 24px)" : "4px" }}
      />
    </button>
  );
}

export function FocusModeSettingsDialog({ open, onClose, session, onSave }: Props) {
  const t = useTranslations("focus");
  const [focusDurationMin, setFocusDurationMin] = useState(String(session.focusDurationMin));
  const [shortBreakMin, setShortBreakMin] = useState(String(session.shortBreakMin));
  const [longBreakMin, setLongBreakMin] = useState(String(session.longBreakMin));
  const [longBreakInterval, setLongBreakInterval] = useState(String(session.longBreakInterval));
  const [autoStartShortBreak, setAutoStartShortBreak] = useState(session.autoStartShortBreak);
  const [autoStartLongBreak, setAutoStartLongBreak] = useState(session.autoStartLongBreak);
  const [error, setError] = useState("");

  const handleSave = () => {
    const values: Record<keyof typeof RANGES, number> = {
      focusDurationMin: Number(focusDurationMin),
      shortBreakMin: Number(shortBreakMin),
      longBreakMin: Number(longBreakMin),
      longBreakInterval: Number(longBreakInterval),
    };

    for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
      const { min, max } = RANGES[key];
      const value = values[key];
      if (!Number.isInteger(value) || value < min || value > max) {
        setError(t("validation_out_of_range", { min, max }));
        return;
      }
    }

    setError("");
    onSave({ ...values, autoStartShortBreak, autoStartLongBreak });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[110]"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-[120] left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden"
          style={{ background: "var(--surface)", maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto p-6 flex flex-col gap-4" style={{ maxHeight: "90dvh" }}>
            <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("session_settings_title")}
            </Dialog.Title>

            <NumberField
              label={t("focus_duration_label")}
              value={focusDurationMin}
              onChange={setFocusDurationMin}
              min={RANGES.focusDurationMin.min}
              max={RANGES.focusDurationMin.max}
              unit={t("duration_unit")}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label={t("short_break_label")}
                value={shortBreakMin}
                onChange={setShortBreakMin}
                min={RANGES.shortBreakMin.min}
                max={RANGES.shortBreakMin.max}
                unit={t("duration_unit")}
              />
              <NumberField
                label={t("long_break_label")}
                value={longBreakMin}
                onChange={setLongBreakMin}
                min={RANGES.longBreakMin.min}
                max={RANGES.longBreakMin.max}
                unit={t("duration_unit")}
              />
            </div>

            <NumberField
              label={t("long_break_interval_label")}
              value={longBreakInterval}
              onChange={setLongBreakInterval}
              min={RANGES.longBreakInterval.min}
              max={RANGES.longBreakInterval.max}
              unit={t("long_break_interval_unit")}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  {t("auto_start_short_break_label")}
                </label>
                <InfoTooltip text={t("auto_start_short_break_hint")} />
              </div>
              <ToggleSwitch
                checked={autoStartShortBreak}
                onChange={() => setAutoStartShortBreak((p) => !p)}
                label={t("auto_start_short_break_label")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  {t("auto_start_long_break_label")}
                </label>
                <InfoTooltip text={t("auto_start_long_break_hint")} />
              </div>
              <ToggleSwitch
                checked={autoStartLongBreak}
                onChange={() => setAutoStartLongBreak((p) => !p)}
                label={t("auto_start_long_break_label")}
              />
            </div>

            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {t("settings_applies_live")}
            </p>

            {error && (
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-3 mt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
                style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-lg text-sm font-semibold transition-opacity active:opacity-70"
                style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              >
                {t("save")}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
