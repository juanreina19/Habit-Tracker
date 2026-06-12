"use client";

import { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import type { Task, UpdateTaskInput } from "../../domain/entities/Task";
import {
  resolveSessionsGoal,
  resolveShortBreakMin,
  resolveLongBreakMin,
  resolveLongBreakInterval,
  resolveAutoStartShortBreak,
  resolveAutoStartLongBreak,
} from "../../domain/entities/Task";

interface Props {
  open: boolean;
  onClose: () => void;
  task: Task;
  onSave: (input: UpdateTaskInput) => Promise<void>;
}

const RANGES = {
  sessionsGoal: { min: 1, max: 12 },
  shortBreakMin: { min: 1, max: 60 },
  longBreakMin: { min: 1, max: 120 },
  longBreakInterval: { min: 1, max: 12 },
} satisfies Record<string, { min: number; max: number }>;

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  hint?: string;
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
      {hint && (
        <p className="text-xs mt-0.5 mb-1.5" style={{ color: "var(--text-secondary)" }}>
          {hint}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[12px] px-3 py-3 text-sm outline-none"
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
          className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-2 w-48 rounded-[10px] p-2 text-center text-xs font-normal normal-case shadow-lg"
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

export function FocusSessionSettingsDialog({ open, onClose, task, onSave }: Props) {
  const t = useTranslations("focus");
  const [sessionsGoal, setSessionsGoal] = useState(String(resolveSessionsGoal(task)));
  const [shortBreakMin, setShortBreakMin] = useState(String(resolveShortBreakMin(task)));
  const [longBreakMin, setLongBreakMin] = useState(String(resolveLongBreakMin(task)));
  const [longBreakInterval, setLongBreakInterval] = useState(String(resolveLongBreakInterval(task)));
  const [autoStartShortBreak, setAutoStartShortBreak] = useState(resolveAutoStartShortBreak(task));
  const [autoStartLongBreak, setAutoStartLongBreak] = useState(resolveAutoStartLongBreak(task));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const values: Record<keyof typeof RANGES, number> = {
      sessionsGoal: Number(sessionsGoal),
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
    setIsSaving(true);
    try {
      await onSave({ ...values, autoStartShortBreak, autoStartLongBreak });
      onClose();
    } catch {
      setError(t("settings_save_error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[24px] outline-none overflow-hidden"
          style={{ background: "var(--surface)", maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto p-6 flex flex-col gap-4" style={{ maxHeight: "90dvh" }}>
            <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("session_settings_title")}
            </Dialog.Title>

            <NumberField
              label={t("sessions_goal_label")}
              hint={t("sessions_goal_hint")}
              value={sessionsGoal}
              onChange={setSessionsGoal}
              min={RANGES.sessionsGoal.min}
              max={RANGES.sessionsGoal.max}
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
              <p className="text-xs" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}

            <div className="flex gap-3 mt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
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
