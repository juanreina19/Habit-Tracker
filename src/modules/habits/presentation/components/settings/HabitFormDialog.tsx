"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { X, Trash2, Save, CornerDownLeft } from "lucide-react";
import { PRESET_COLORS } from "@/shared/components/ui/ColorPicker";
import { HABIT_EMOJIS } from "@/shared/components/ui/EmojiPicker";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { IconPicker } from "@/shared/components/ui/IconPicker";
import { DAY_LETTERS } from "@/shared/constants/dayLabels";
import type { Habit } from "../../../domain/entities/Habit";
import type { CreateHabitInput, UpdateHabitInput } from "../../../domain/repositories/IHabitRepository";
import type { Category } from "@/modules/categories/domain/entities/Category";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
type IconTab = "emoji" | "svg";
type TFunc = ReturnType<typeof useTranslations>;

function calcEndTime(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  habit?: Habit | null;
  categories: Category[];
  onSave: (data: CreateHabitInput | UpdateHabitInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

/**
 * Formulario plano de una sola pantalla — mismo patrón que TaskFormDialog.tsx
 * y WorkoutFormDialog.tsx (pills + popovers, background var(--bg), acciones
 * abajo con border-top). Reemplaza el wizard de 3 pasos + sub-sheets a
 * pantalla completa que tenía antes.
 */
export function HabitFormDialog({ open, onClose, habit, categories, onSave, onDelete }: Props) {
  const t = useTranslations("habitForm");
  const tDays = useTranslations("dayLabels");
  const tCat = useTranslations("iconCategories");
  const isEdit = !!habit;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [activeDays, setActiveDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  const [nameError, setNameError] = useState("");
  const [daysError, setDaysError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [catOpen, setCatOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(habit?.name ?? "");
      setDescription(habit?.description ?? "");
      setIcon(habit?.icon ?? null);
      setColor(habit?.color ?? null);
      setCategoryId(habit?.categoryId ?? null);
      setActiveDays(habit?.activeDays ?? [1, 2, 3, 4, 5, 6, 7]);
      setStartTime(habit?.startTime?.slice(0, 5) ?? "");
      setEstimatedMinutes(habit?.estimatedMinutes?.toString() ?? "");
      setNameError("");
      setDaysError("");
      setIsSaving(false);
      setIsDeleting(false);
      setConfirmDelete(false);
      setCatOpen(false);
      setDaysOpen(false);
      setTimeOpen(false);
      setColorOpen(false);
      setIconPickerOpen(false);
    }
  }, [open, habit]);

  useEffect(() => {
    if (!catOpen && !daysOpen && !timeOpen && !colorOpen) return;
    const handler = () => { setCatOpen(false); setDaysOpen(false); setTimeOpen(false); setColorOpen(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [catOpen, daysOpen, timeOpen, colorOpen]);

  const toggleDay = (day: number) => {
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
    setDaysError("");
  };

  const endTime = startTime && estimatedMinutes && !isNaN(parseInt(estimatedMinutes, 10))
    ? calcEndTime(startTime, parseInt(estimatedMinutes, 10))
    : null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("name_error")); return; }
    if (activeDays.length === 0) { setDaysError(t("days_error")); return; }

    const minutes = estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined;
    setIsSaving(true);
    try {
      await onSave({
        name: trimmed,
        description: description.trim() || undefined,
        icon: icon ?? undefined,
        color: color ?? undefined,
        categoryId,
        activeDays,
        estimatedMinutes: minutes && !isNaN(minutes) ? minutes : undefined,
        startTime: startTime || null,
      });
      onClose();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : t("save_error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const daysLabel = activeDays.length > 0 ? activeDays.map((d) => DAY_LETTERS[d - 1]).join(" ") : "—";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden glass-panel-elevated"
          style={{ maxHeight: "90dvh" }}
        >
          <div className="overflow-y-auto px-6 pt-3 pb-6" style={{ maxHeight: "90dvh" }}>
            <div className="flex items-center justify-end mb-0.5 -mr-3">
              <Dialog.Title className="sr-only">
                {isEdit ? t("edit_title") : t("new_title")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="p-1 rounded-md transition-opacity active:opacity-70" style={{ color: "var(--text-muted)" }}>
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <AnimatePresence mode="wait">
              {confirmDelete ? (
                <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("delete_confirm")}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 rounded-md text-sm font-medium transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
                      {t("cancel")}
                    </button>
                    <button onClick={handleDelete} disabled={isDeleting}
                      className="flex-1 py-3 rounded-md text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50"
                      style={{ background: "var(--danger)", color: "#ffffff" }}>
                      {isDeleting ? "…" : t("delete")}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-5"
                >
                  {/* Nombre */}
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !isEdit && name.trim()) { e.preventDefault(); handleSave(); } }}
                      placeholder={t("name_placeholder")}
                      maxLength={60}
                      autoFocus
                      className="w-full text-2xl font-normal outline-none bg-transparent"
                      style={{ color: "var(--text-primary)", borderBottom: nameError ? "2px solid var(--danger)" : "none" }}
                    />
                    {nameError && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{nameError}</p>}
                  </div>

                  {/* Descripción */}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("description_placeholder")}
                    rows={2}
                    className="w-full text-sm outline-none resize-none bg-transparent"
                    style={{ color: "var(--text-secondary)" }}
                  />

                  {/* Metadata pills row */}
                  <div className="flex flex-wrap gap-1.5 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Categoría */}
                    {categories.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCatOpen((p) => !p); setDaysOpen(false); setTimeOpen(false); setColorOpen(false); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: categories.find((c) => c.id === categoryId)?.color ?? "var(--text-muted)" }} />
                          <span style={{ color: "var(--text-muted)" }}>IN</span>
                          {categories.find((c) => c.id === categoryId)?.name ?? "—"}
                        </button>
                        {catOpen && (
                          <div
                            className="absolute left-0 bottom-full mb-1 z-10 rounded-2xl p-1 min-w-[140px] glass-panel-elevated"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button type="button" onClick={() => { setCategoryId(null); setCatOpen(false); }}
                              className="w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors"
                              style={{ color: !categoryId ? "var(--text-primary)" : "var(--text-secondary)" }}>
                              —
                            </button>
                            {categories.map((cat) => (
                              <button key={cat.id} type="button" onClick={() => { setCategoryId(cat.id); setCatOpen(false); }}
                                className="w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors"
                                style={{ color: categoryId === cat.id ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                {cat.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />}
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Días activos */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDaysOpen((p) => !p); setCatOpen(false); setTimeOpen(false); setColorOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                        style={{ background: "transparent", border: `1px solid ${daysError ? "var(--danger)" : "var(--border)"}`, color: "var(--text-primary)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeDays.length > 0 ? "var(--info)" : "var(--text-muted)" }} />
                        <span style={{ color: "var(--text-muted)" }}>{t("days_label").toUpperCase()}</span>
                        {daysLabel}
                      </button>
                      {daysOpen && (
                        <div
                          className="absolute left-0 bottom-full mb-1 z-10 rounded-2xl p-2 flex gap-1 glass-panel-elevated"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ALL_DAYS.map((day) => {
                            const on = activeDays.includes(day);
                            return (
                              <button key={day} type="button" onClick={() => toggleDay(day)}
                                className="w-8 h-8 rounded-full text-xs transition-colors"
                                style={{
                                  background: on ? "var(--text-primary)" : "transparent",
                                  color: on ? "var(--bg)" : "var(--text-secondary)",
                                  border: "1px solid var(--border)",
                                }}>
                                {tDays(`d${day}` as Parameters<typeof tDays>[0])}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {daysError && <p className="w-full text-xs" style={{ color: "var(--danger)" }}>{daysError}</p>}

                    {/* Horario — hora inicio + duración estimada (opcional) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTimeOpen((p) => !p); setCatOpen(false); setDaysOpen(false); setColorOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: startTime ? "var(--purple)" : "var(--text-muted)" }} />
                        <span style={{ color: "var(--text-muted)" }}>{t("start_label").toUpperCase()}</span>
                        {startTime || t("no_schedule")}
                      </button>
                      {timeOpen && (
                        <div
                          className="absolute left-0 bottom-full mb-1 z-10 rounded-2xl p-2 flex flex-col gap-3 w-64 glass-panel-elevated"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                              {t("start_label")}
                            </span>
                            <input
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              className="rounded-md px-2 py-1.5 text-sm outline-none glass-panel"
                              style={{ color: "var(--text-primary)", colorScheme: "dark", accentColor: "var(--text-primary)" }}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                              {t("duration_label")}
                            </span>
                            <input
                              type="number"
                              value={estimatedMinutes}
                              onChange={(e) => setEstimatedMinutes(e.target.value)}
                              placeholder="30"
                              min={1}
                              max={480}
                              className="rounded-md px-2 py-1.5 text-sm outline-none w-full glass-panel"
                              style={{ color: "var(--text-primary)" }}
                            />
                          </div>
                          {endTime && (
                            <p className="text-xs font-medium" style={{ color: "#4CAF82" }}>{t("ends_at", { time: endTime })}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setTimeOpen(false)}
                            className="self-center flex items-center justify-center gap-1.5 rounded-sm px-4 py-2.5 text-xs"
                            style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                          >
                            {t("confirm_time")}
                            <CornerDownLeft size={12} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Color */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setColorOpen((p) => !p); setCatOpen(false); setDaysOpen(false); setTimeOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color ?? "var(--text-muted)" }} />
                        <span style={{ color: "var(--text-muted)" }}>{t("color_label").toUpperCase()}</span>
                        {color ?? t("no_color")}
                      </button>
                      {colorOpen && (
                        <div
                          className="absolute left-0 bottom-full mb-1 z-10 rounded-2xl p-3 glass-panel-elevated"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-6 gap-2">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => { setColor(c === color ? null : c); setColorOpen(false); }}
                                className="w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-90"
                                style={{ background: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
                              >
                                {color === c && (
                                  <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                                    <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                          {color && (
                            <button type="button" onClick={() => { setColor(null); setColorOpen(false); }}
                              className="mt-2 text-[11px] font-medium transition-opacity active:opacity-60"
                              style={{ color: "var(--text-secondary)" }}>
                              {t("remove_color")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ícono — compact row, igual patrón que Tasks */}
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-opacity active:opacity-70 w-full glass-panel"
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: icon ? (color ?? "#4CAF82") + "25" : "var(--border)" }}
                    >
                      {icon ? (
                        <HabitIcon icon={icon} size={16} color={color ?? "var(--text-primary)"} />
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </div>
                    <span className="text-sm font-medium flex-1 text-left" style={{ color: "var(--text-primary)" }}>
                      {icon ? (icon.startsWith("lucide:") ? icon.slice(7) : icon) : t("no_icon")}
                    </span>
                  </button>
                  <HabitIconPickerDialog
                    open={iconPickerOpen}
                    onClose={() => setIconPickerOpen(false)}
                    value={icon}
                    onChange={setIcon}
                    categoryLabel={(key) => tCat(key as Parameters<typeof tCat>[0])}
                    t={t}
                  />

                  {/* Acciones */}
                  <div className="flex items-center gap-3 mt-1 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {isEdit && onDelete && (
                      <button onClick={() => setConfirmDelete(true)} className="p-2.5 rounded-md transition-opacity active:opacity-70"
                        style={{ color: "var(--danger)" }} aria-label={t("delete")}>
                        <Trash2 size={18} />
                      </button>
                    )}
                    {!isEdit && (
                      <p className="flex-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        {t("save_hint_prefix")}{" "}<span style={{ color: "var(--text-primary)" }}>Enter</span>{" "}{t("save_hint_suffix")}
                      </p>
                    )}
                    <div className="ml-auto">
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-30"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      >
                        {isSaving ? t("saving") : isEdit ? <><Save size={14} />{t("save")}</> : t("add_habit")}
                        {!isEdit && <span>→</span>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Icon picker (emoji + svg tabs) — mismo shell que IconPickerDialog.tsx,
// con las 2 pestañas que ya tenía Habit (Tasks no las necesita, solo svg). ──

function HabitIconPickerDialog({ open, onClose, value, onChange, categoryLabel, t }: {
  open: boolean;
  onClose: () => void;
  value: string | null;
  onChange: (icon: string | null) => void;
  categoryLabel: (key: string) => string;
  t: TFunc;
}) {
  const [tab, setTab] = useState<IconTab>("emoji");

  useEffect(() => { if (open) setTab("emoji"); }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl outline-none overflow-hidden glass-panel-elevated"
          style={{ maxHeight: "85dvh" }}
        >
          <div className="overflow-y-auto p-6" style={{ maxHeight: "85dvh" }}>
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("icon_label")}
              </Dialog.Title>
              <button type="button" onClick={onClose} aria-label="close"
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
                style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex rounded-md p-1 mb-4" style={{ background: "var(--surface-elevated)" }}>
              {(["emoji", "svg"] as IconTab[]).map((tabType) => (
                <button key={tabType} type="button" onClick={() => setTab(tabType)}
                  className="flex-1 py-2 rounded-sm text-xs font-medium transition-colors"
                  style={{ background: tab === tabType ? "var(--surface)" : "transparent", color: tab === tabType ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {tabType === "emoji" ? t("tab_emoji") : t("tab_svg")}
                </button>
              ))}
            </div>

            {tab === "emoji" ? (
              <div className="flex flex-wrap gap-2 pb-2">
                <button type="button" onClick={() => { onChange(null); onClose(); }}
                  className="w-12 h-12 rounded-md flex items-center justify-center text-xs transition-transform active:scale-90"
                  style={{ background: !value ? "var(--surface-elevated)" : "transparent", border: `1.5px solid ${!value ? "var(--btn-primary-bg)" : "var(--border)"}`, color: "var(--text-muted)" }}>
                  {t("no_icon")}
                </button>
                {HABIT_EMOJIS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => { onChange(value === emoji ? null : emoji); onClose(); }}
                    className="w-12 h-12 rounded-md flex items-center justify-center text-2xl transition-transform active:scale-90"
                    style={{ background: value === emoji ? "var(--surface-elevated)" : "transparent", border: `1.5px solid ${value === emoji ? "var(--btn-primary-bg)" : "var(--border)"}` }}>
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="pb-4">
                <IconPicker
                  value={value}
                  onChange={(next) => { onChange(next); onClose(); }}
                  allowNone
                  noneLabel={t("no_icon")}
                  categoryLabel={categoryLabel}
                />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
