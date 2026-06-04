"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ColorPicker } from "@/shared/components/ui/ColorPicker";
import { EmojiPicker } from "@/shared/components/ui/EmojiPicker";
import type { Habit } from "../../../domain/entities/Habit";
import type { CreateHabitInput, UpdateHabitInput } from "../../../domain/repositories/IHabitRepository";
import type { Category } from "@/modules/categories/domain/entities/Category";

function calcEndTime(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const DAY_LABELS: Record<number, string> = {
  1: "L", 2: "M", 3: "X", 4: "J", 5: "V", 6: "S", 7: "D",
};
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

interface Props {
  open: boolean;
  onClose: () => void;
  habit?: Habit | null;
  categories: Category[];
  onSave: (data: CreateHabitInput | UpdateHabitInput) => Promise<void>;
}

export function HabitFormDialog({ open, onClose, habit, categories, onSave }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [daysError, setDaysError] = useState("");

  useEffect(() => {
    if (open) {
      setName(habit?.name ?? "");
      setIcon(habit?.icon ?? null);
      setColor(habit?.color ?? null);
      setCategoryId(habit?.categoryId ?? null);
      setActiveDays(habit?.activeDays ?? [1, 2, 3, 4, 5, 6, 7]);
      setEstimatedMinutes(habit?.estimatedMinutes?.toString() ?? "");
      setStartTime(habit?.startTime ?? "");
      setNameError("");
      setDaysError("");
    }
  }, [open, habit]);

  const toggleDay = (day: number) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
    setDaysError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    let valid = true;

    if (!trimmed) {
      setNameError("El nombre es obligatorio");
      valid = false;
    }
    if (activeDays.length === 0) {
      setDaysError("Selecciona al menos un día");
      valid = false;
    }
    if (!valid) return;

    const minutes = estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined;

    setIsSaving(true);
    try {
      const data: CreateHabitInput | UpdateHabitInput = {
        name: trimmed,
        icon: icon ?? undefined,
        color: color ?? undefined,
        categoryId: categoryId,
        activeDays,
        estimatedMinutes: minutes && !isNaN(minutes) ? minutes : undefined,
        startTime: startTime || null,
      };
      await onSave(data);
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
          className="fixed z-50 left-1/2 bottom-0 w-full max-w-lg -translate-x-1/2 rounded-t-[24px] outline-none overflow-y-auto overflow-x-hidden"
          style={{ background: "var(--surface)", maxHeight: "92dvh" }}
        >
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              {habit ? "Editar hábito" : "Nuevo hábito"}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  NOMBRE
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  placeholder="Ej: Meditación"
                  maxLength={60}
                  className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
                  style={{
                    background: "var(--surface-elevated)",
                    color: "var(--text-primary)",
                    border: nameError ? "1.5px solid #FF5252" : "1.5px solid transparent",
                  }}
                />
                {nameError && (
                  <p className="text-xs mt-1" style={{ color: "#FF5252" }}>{nameError}</p>
                )}
              </div>

              {/* Active days */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  DÍAS ACTIVOS
                </label>
                <div className="flex gap-2">
                  {ALL_DAYS.map((day) => {
                    const isOn = activeDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className="flex-1 py-2.5 rounded-[10px] text-xs font-semibold transition-all active:scale-95"
                        style={{
                          background: isOn ? "#FFFFFF" : "var(--surface-elevated)",
                          color: isOn ? "#000000" : "#8888AA",
                        }}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
                {daysError && (
                  <p className="text-xs mt-1" style={{ color: "#FF5252" }}>{daysError}</p>
                )}
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    CATEGORÍA
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryId(null)}
                      className="px-3 py-2 rounded-[10px] text-xs font-medium transition-all active:scale-95"
                      style={{
                        background: categoryId === null ? "var(--surface-elevated)" : "transparent",
                        color: categoryId === null ? "#FFFFFF" : "#8888AA",
                        border: `1.5px solid ${categoryId === null ? "#FFFFFF30" : "var(--surface-elevated)"}`,
                      }}
                    >
                      Sin categoría
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className="px-3 py-2 rounded-[10px] text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
                        style={{
                          background: categoryId === cat.id ? (cat.color ?? "var(--surface-elevated)") + "25" : "transparent",
                          color: categoryId === cat.id ? (cat.color ?? "#FFFFFF") : "#8888AA",
                          border: `1.5px solid ${categoryId === cat.id ? (cat.color ?? "#FFFFFF") + "60" : "var(--surface-elevated)"}`,
                        }}
                      >
                        {cat.icon && <span>{cat.icon}</span>}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start time */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  HORA DE INICIO (opcional)
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-3 outline-none"
                  style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent", colorScheme: "dark", fontSize: "16px", WebkitAppearance: "none", appearance: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Estimated minutes */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  DURACIÓN (minutos, opcional)
                </label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="Ej: 20"
                  min={1}
                  max={480}
                  className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
                />
              </div>
              {startTime && estimatedMinutes && !isNaN(parseInt(estimatedMinutes, 10)) && (
                <p className="text-xs -mt-3" style={{ color: "#4CAF82" }}>
                  Fin: {calcEndTime(startTime, parseInt(estimatedMinutes, 10))}
                </p>
              )}

              {/* Color */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  COLOR
                </label>
                <ColorPicker value={color} onChange={setColor} />
              </div>

              {/* Icon */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  ICONO (toca para seleccionar o deseleccionar)
                </label>
                <EmojiPicker value={icon} onChange={setIcon} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1 pb-safe">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                  style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
                  style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                >
                  {isSaving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
