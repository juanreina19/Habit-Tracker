"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { PRESET_COLORS } from "@/shared/components/ui/ColorPicker";
import { HABIT_EMOJIS } from "@/shared/components/ui/EmojiPicker";
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from "../../domain/entities/Subject";

interface Props {
  open: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSave: (data: CreateSubjectInput | UpdateSubjectInput) => Promise<void>;
}

export function SubjectFormDialog({ open, onClose, subject, onSave }: Props) {
  const t = useTranslations("studies");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (open) {
      setName(subject?.name ?? "");
      setColor(subject?.color ?? null);
      setIcon(subject?.icon ?? null);
      setNameError("");
    }
  }, [open, subject]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("subject_name"));
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ name: trimmed, color, icon });
      onClose();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none p-6"
          style={{ background: "var(--surface)" }}
        >
          <Dialog.Title className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
            {subject ? t("edit_subject") : t("add_subject")}
          </Dialog.Title>

          {/* Name */}
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              {t("subject_name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              placeholder={t("subject_name_placeholder")}
              maxLength={50}
              className="w-full rounded-md px-4 py-3 text-sm outline-none"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-primary)",
                border: nameError ? "1.5px solid var(--danger)" : "1.5px solid transparent",
              }}
            />
            {nameError && <p className="text-xs mt-1.5" style={{ color: "var(--danger)" }}>{nameError}</p>}
          </div>

          {/* Color */}
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-secondary)" }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.slice(0, 12).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(color === c ? null : c)}
                  className="w-8 h-8 rounded-full transition-transform active:scale-90"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-secondary)" }}>
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_EMOJIS.slice(0, 18).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(icon === emoji ? null : emoji)}
                  className="w-10 h-10 rounded-md flex items-center justify-center text-xl transition-transform active:scale-90"
                  style={{
                    background: icon === emoji ? "var(--surface-elevated)" : "transparent",
                    border: `1.5px solid ${icon === emoji ? "var(--btn-primary-bg)" : "var(--border)"}`,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
              style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 rounded-lg text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              {isSaving ? t("saving") : t("save")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
