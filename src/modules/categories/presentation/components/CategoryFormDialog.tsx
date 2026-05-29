"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ColorPicker } from "@/shared/components/ui/ColorPicker";
import { EmojiPicker } from "@/shared/components/ui/EmojiPicker";
import type { Category } from "../../domain/entities/Category";
import type { CreateCategoryInput, UpdateCategoryInput } from "../../domain/repositories/ICategoryRepository";

interface Props {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  onSave: (data: CreateCategoryInput | UpdateCategoryInput) => Promise<void>;
}

export function CategoryFormDialog({ open, onClose, category, onSave }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setColor(category?.color ?? null);
      setIcon(category?.icon ?? null);
      setNameError("");
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("El nombre es obligatorio");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ name: trimmed, color: color ?? undefined, icon: icon ?? undefined });
      onClose();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Error al guardar");
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
          className="fixed z-50 left-1/2 bottom-0 w-full max-w-lg -translate-x-1/2 rounded-t-[24px] p-6 outline-none"
          style={{ background: "#1A1A2E" }}
        >
          <Dialog.Title className="text-lg font-semibold mb-5" style={{ color: "#FFFFFF" }}>
            {category ? "Editar categoría" : "Nueva categoría"}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Name */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8888AA" }}>
                NOMBRE
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                placeholder="Ej: Salud"
                maxLength={50}
                className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
                style={{
                  background: "#252540",
                  color: "#FFFFFF",
                  border: nameError ? "1.5px solid #FF5252" : "1.5px solid transparent",
                }}
              />
              {nameError && (
                <p className="text-xs mt-1" style={{ color: "#FF5252" }}>{nameError}</p>
              )}
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8888AA" }}>
                COLOR
              </label>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            {/* Icon */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#8888AA" }}>
                ICONO (toca para seleccionar o deseleccionar)
              </label>
              <EmojiPicker value={icon} onChange={setIcon} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                style={{ background: "#252540", color: "#8888AA" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
                style={{ background: "#FFFFFF", color: "#0F0F1A" }}
              >
                {isSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
