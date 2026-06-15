"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { PRESET_COLORS } from "@/shared/components/ui/ColorPicker";
import { HABIT_EMOJIS } from "@/shared/components/ui/EmojiPicker";
import type { Category } from "../../domain/entities/Category";
import type { CreateCategoryInput, UpdateCategoryInput } from "../../domain/repositories/ICategoryRepository";

// ─── Types ────────────────────────────────────────────────────────────────────

type Scene = "step0" | "step1" | "color" | "icon" | "edit";

interface Props {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  onSave: (data: CreateCategoryInput | UpdateCategoryInput) => Promise<void>;
}

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0 }),
};
const slideTransition = { type: "tween", duration: 0.15, ease: [0.4, 0, 0.2, 1] } as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryFormDialog({ open, onClose, category, onSave }: Props) {
  const t = useTranslations("categoryForm");
  const [scene, setScene] = useState<Scene>("step0");
  const [slideDir, setSlideDir] = useState(1);

  const [name, setName]       = useState("");
  const [color, setColor]     = useState<string | null>(null);
  const [icon, setIcon]       = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (open) {
      setScene(category ? "edit" : "step0");
      setSlideDir(1);
      setName(category?.name ?? "");
      setColor(category?.color ?? null);
      setIcon(category?.icon ?? null);
      setNameError("");
    }
  }, [open, category]);

  const navigate = (to: Scene, dir: number) => { setSlideDir(dir); setScene(to); };
  const homeScene = (): Scene => (category ? "edit" : "step1");

  const goNext = () => {
    if (scene === "step0") {
      if (!name.trim()) { setNameError(t("name_error")); return; }
      setNameError("");
      navigate("step1", 1);
    }
  };

  const goBack = () => {
    if (scene === "color" || scene === "icon") navigate(homeScene(), -1);
    else if (scene === "step1") navigate("step0", -1);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      if (!category) navigate("step0", -1);
      setNameError(t("name_error"));
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ name: trimmed, color: color ?? undefined, icon: icon ?? undefined });
      onClose();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : t("saving"));
    } finally {
      setIsSaving(false);
    }
  };

  const isSubSheet = scene === "color" || scene === "icon";
  const isWizardScene = scene === "step0" || scene === "step1";
  const stepIndex = scene === "step0" ? 0 : 1;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[24px] outline-none overflow-hidden"
          style={{ background: "var(--surface)", maxHeight: "85dvh" }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: "85dvh" }}>
            <AnimatePresence mode="popLayout" custom={slideDir}>
              <motion.div
                key={scene}
                custom={slideDir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="p-6"
              >
                {/* ── Wizard header (create mode) ────────────── */}
                {isWizardScene && (
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t("new_title")}
                    </Dialog.Title>
                    <div className="flex items-center gap-1.5">
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="rounded-full transition-all duration-300"
                          style={{
                            width: i === stepIndex ? 20 : 6,
                            height: 6,
                            background: i === stepIndex ? "var(--btn-primary-bg)" : "var(--border)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Edit header ────────────────────────────── */}
                {scene === "edit" && (
                  <div className="mb-6">
                    <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t("edit_title")}
                    </Dialog.Title>
                  </div>
                )}

                {/* ── Sub-sheet header ───────────────────────── */}
                {isSubSheet && (
                  <div className="flex items-center gap-3 mb-5">
                    <button
                      type="button"
                      onClick={goBack}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--surface-elevated)" }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {scene === "color" ? t("color_label") : t("icon_label")}
                    </Dialog.Title>
                  </div>
                )}

                {/* ── Step 0: Name ───────────────────────────── */}
                {scene === "step0" && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                      {t("name_label")}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError(""); }}
                      placeholder={t("name_placeholder")}
                      maxLength={50}
                      className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
                      style={{
                        background: "var(--surface-elevated)",
                        color: "var(--text-primary)",
                        border: nameError ? "1.5px solid #FF5252" : "1.5px solid transparent",
                      }}
                    />
                    {nameError && <p className="text-xs mt-1.5" style={{ color: "#FF5252" }}>{nameError}</p>}
                  </div>
                )}

                {/* ── Step 1: Appearance ─────────────────────── */}
                {scene === "step1" && (
                  <AppearanceRows color={color} icon={icon} navigate={navigate} t={t} />
                )}

                {/* ── Edit flat view ─────────────────────────── */}
                {scene === "edit" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                        {t("name_label")}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setNameError(""); }}
                        placeholder={t("name_placeholder")}
                        maxLength={50}
                        className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
                        style={{
                          background: "var(--surface-elevated)",
                          color: "var(--text-primary)",
                          border: nameError ? "1.5px solid #FF5252" : "1.5px solid transparent",
                        }}
                      />
                      {nameError && <p className="text-xs mt-1.5" style={{ color: "#FF5252" }}>{nameError}</p>}
                    </div>

                    <AppearanceRows color={color} icon={icon} navigate={navigate} t={t} />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      >
                        {isSaving ? t("saving") : t("save")}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Color sub-sheet ────────────────────────── */}
                {scene === "color" && (
                  <div>
                    <div className="grid grid-cols-6 gap-3">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setColor(c === color ? null : c); navigate(homeScene(), -1); }}
                          className="aspect-square rounded-full flex items-center justify-center transition-transform active:scale-90"
                          style={{
                            background: c,
                            outline: color === c ? `3px solid ${c}` : "none",
                            outlineOffset: "3px",
                          }}
                        >
                          {color === c && (
                            <svg width="14" height="11" viewBox="0 0 12 10" fill="none">
                              <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                    {color && (
                      <button
                        type="button"
                        onClick={() => { setColor(null); navigate(homeScene(), -1); }}
                        className="mt-4 text-xs font-medium transition-opacity active:opacity-60"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {t("remove_color")}
                      </button>
                    )}
                  </div>
                )}

                {/* ── Icon sub-sheet ─────────────────────────── */}
                {scene === "icon" && (
                  <div className="flex flex-wrap gap-2 pb-2">
                    {HABIT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { setIcon(icon === emoji ? null : emoji); navigate(homeScene(), -1); }}
                        className="w-12 h-12 rounded-[12px] flex items-center justify-center text-2xl transition-all active:scale-90"
                        style={{
                          background: icon === emoji ? "var(--surface-elevated)" : "transparent",
                          border: `1.5px solid ${icon === emoji ? "var(--btn-primary-bg)" : "var(--border)"}`,
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Wizard nav buttons (create mode) ──────── */}
                {isWizardScene && (
                  <div className="flex gap-3 mt-6">
                    {scene === "step0" ? (
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                      >
                        {t("cancel")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={goBack}
                        className="flex items-center justify-center gap-1 px-5 py-3 rounded-[14px] text-sm font-medium transition-opacity active:opacity-70"
                        style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                      >
                        <ChevronLeft size={15} /> {t("previous")}
                      </button>
                    )}

                    {scene === "step0" ? (
                      <button
                        type="button"
                        onClick={goNext}
                        className="flex-1 flex items-center justify-center gap-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      >
                        {t("next")} <ChevronRight size={15} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                      >
                        {isSaving ? t("saving") : t("save")}
                      </button>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Shared appearance rows ───────────────────────────────────────────────────

type TFunc = ReturnType<typeof useTranslations>;

function AppearanceRows({ color, icon, navigate, t }: {
  color: string | null;
  icon: string | null;
  navigate: (to: Scene, dir: number) => void;
  t: TFunc;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Color row */}
      <button
        type="button"
        onClick={() => navigate("color", 1)}
        className="w-full flex items-center justify-between px-4 py-4 rounded-[14px] transition-opacity active:opacity-70"
        style={{ background: "var(--surface-elevated)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex-shrink-0 border-2"
            style={{
              background: color ?? "var(--border)",
              borderColor: color ? color + "60" : "var(--border)",
            }}
          />
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("color_label")}</p>
            <p className="text-xs mt-0.5" style={{ color: color ?? "var(--text-secondary)" }}>
              {color ?? t("no_color")}
            </p>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </button>

      {/* Icon row */}
      <button
        type="button"
        onClick={() => navigate("icon", 1)}
        className="w-full flex items-center justify-between px-4 py-4 rounded-[14px] transition-opacity active:opacity-70"
        style={{ background: "var(--surface-elevated)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 text-2xl"
            style={{ background: icon ? (color ?? "#4CAF82") + "25" : "var(--border)" }}
          >
            {icon ?? <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("icon_label")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {icon ?? t("no_icon")}
            </p>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </button>
    </div>
  );
}
