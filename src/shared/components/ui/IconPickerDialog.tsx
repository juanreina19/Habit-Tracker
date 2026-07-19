"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { IconPicker } from "./IconPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  value: string | null;
  onChange: (icon: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  title: string;
  categoryLabel: (key: string) => string;
}

export function IconPickerDialog({ open, onClose, value, onChange, allowNone, noneLabel, title, categoryLabel }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden glass-panel-elevated"
          style={{ maxHeight: "85dvh" }}
        >
          <div className="overflow-y-auto p-6" style={{ maxHeight: "85dvh" }}>
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {title}
              </Dialog.Title>
              <button
                type="button"
                onClick={onClose}
                aria-label="close"
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
                style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>
            </div>

            <IconPicker
              value={value}
              onChange={(next) => { onChange(next); onClose(); }}
              allowNone={allowNone}
              noneLabel={noneLabel}
              categoryLabel={categoryLabel}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
