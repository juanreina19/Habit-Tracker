"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { PRESET_COLORS } from "@/shared/components/ui/ColorPicker";
import { HABIT_EMOJIS } from "@/shared/components/ui/EmojiPicker";
import { HabitIcon, LUCIDE_ICON_MAP, LUCIDE_CATEGORIES } from "@/shared/components/ui/HabitIcon";
import type { Habit } from "../../../domain/entities/Habit";
import type { CreateHabitInput, UpdateHabitInput } from "../../../domain/repositories/IHabitRepository";
import type { Category } from "@/modules/categories/domain/entities/Category";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcEndTime(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

// ─── Types ────────────────────────────────────────────────────────────────────

type Scene = "step0" | "step1" | "step2" | "color" | "icon" | "edit" | "edit_days";
type IconTab = "emoji" | "svg";

interface Props {
  open: boolean;
  onClose: () => void;
  habit?: Habit | null;
  categories: Category[];
  onSave: (data: CreateHabitInput | UpdateHabitInput) => Promise<void>;
}

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0 }),
};
const slideTransition = { type: "tween", duration: 0.15, ease: [0.4, 0, 0.2, 1] } as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function HabitFormDialog({ open, onClose, habit, categories, onSave }: Props) {
  const t = useTranslations("habitForm");
  const tDays = useTranslations("dayLabels");
  const tCat = useTranslations("iconCategories");
  const [scene, setScene] = useState<Scene>("step0");
  const [slideDir, setSlideDir] = useState(1);
  const [iconTab, setIconTab] = useState<IconTab>("emoji");

  const [name, setName]                         = useState("");
  const [icon, setIcon]                         = useState<string | null>(null);
  const [color, setColor]                       = useState<string | null>(null);
  const [categoryId, setCategoryId]             = useState<string | null>(null);
  const [activeDays, setActiveDays]             = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [timeEnabled, setTimeEnabled]           = useState(false);
  const [startTime, setStartTime]               = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [isSaving, setIsSaving]                 = useState(false);
  const [nameError, setNameError]               = useState("");
  const [daysError, setDaysError]               = useState("");

  useEffect(() => {
    if (open) {
      setScene(habit ? "edit" : "step0");
      setSlideDir(1);
      setIconTab("emoji");
      setName(habit?.name ?? "");
      setIcon(habit?.icon ?? null);
      setColor(habit?.color ?? null);
      setCategoryId(habit?.categoryId ?? null);
      setActiveDays(habit?.activeDays ?? [1, 2, 3, 4, 5, 6, 7]);
      setTimeEnabled(!!(habit?.startTime));
      setStartTime(habit?.startTime ?? "");
      setEstimatedMinutes(habit?.estimatedMinutes?.toString() ?? "");
      setNameError("");
      setDaysError("");
    }
  }, [open, habit]);

  const navigate = (to: Scene, dir: number) => { setSlideDir(dir); setScene(to); };

  // "home" scene = where color/icon sub-sheets return to
  const homeScene = (): Scene => (habit ? "edit" : "step2");

  const toggleDay = (day: number) => {
    setActiveDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day].sort((a, b) => a - b));
    setDaysError("");
  };

  const goNext = () => {
    if (scene === "step0") {
      if (!name.trim()) { setNameError(t("name_error")); return; }
      setNameError("");
      navigate("step1", 1);
    } else if (scene === "step1") {
      if (activeDays.length === 0) { setDaysError(t("days_error")); return; }
      setDaysError("");
      navigate("step2", 1);
    }
  };

  const goBack = () => {
    if (scene === "edit_days") navigate("edit", -1);
    else if (scene === "color" || scene === "icon") navigate(homeScene(), -1);
    else if (scene === "step2") navigate("step1", -1);
    else if (scene === "step1") navigate("step0", -1);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      if (!habit) navigate("step0", -1);
      setNameError(t("name_error"));
      return;
    }
    if (activeDays.length === 0) {
      if (!habit) navigate("step1", -1);
      setDaysError(t("days_error"));
      return;
    }
    const minutes = estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined;
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        icon: icon ?? undefined,
        color: color ?? undefined,
        categoryId,
        activeDays,
        estimatedMinutes: minutes && !isNaN(minutes) ? minutes : undefined,
        startTime: timeEnabled ? (startTime || null) : null,
      });
      onClose();
    } catch (err) {
      if (!habit) navigate("step0", -1);
      setNameError(err instanceof Error ? err.message : t("save_error"));
    } finally {
      setIsSaving(false);
    }
  };

  const endTime = timeEnabled && startTime && estimatedMinutes && !isNaN(parseInt(estimatedMinutes, 10))
    ? calcEndTime(startTime, parseInt(estimatedMinutes, 10))
    : null;

  const isWizardScene = scene === "step0" || scene === "step1" || scene === "step2";
  const isSubSheet = scene === "color" || scene === "icon" || scene === "edit_days";
  const stepIndex = scene === "step0" ? 0 : scene === "step1" ? 1 : 2;

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
                style={{ willChange: "transform, opacity" }}
                className="p-6"
              >

                {/* ── Wizard header (create mode, steps 0-2) ──── */}
                {isWizardScene && (
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t("new_title")}
                    </Dialog.Title>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
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

                {/* ── Edit flat-view header ────────────────────── */}
                {scene === "edit" && (
                  <div className="mb-6">
                    <Dialog.Title className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t("edit_title")}
                    </Dialog.Title>
                  </div>
                )}

                {/* ── Sub-sheet header (back + title) ──────────── */}
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
                      {scene === "color" ? t("color_label") : scene === "icon" ? t("icon_label") : t("edit_days_title")}
                    </Dialog.Title>
                  </div>
                )}

                {/* ── Step 0: Basic (create) ─────────────────────── */}
                {scene === "step0" && (
                  <div className="flex flex-col gap-5">
                    <NameField name={name} setName={setName} nameError={nameError} setNameError={setNameError} t={t} />
                    <CategoryField categories={categories} categoryId={categoryId} setCategoryId={setCategoryId} t={t} />
                  </div>
                )}

                {/* ── Step 1: Schedule (create) ──────────────────── */}
                {scene === "step1" && (
                  <div className="flex flex-col gap-5">
                    <DaysGrid activeDays={activeDays} toggleDay={toggleDay} daysError={daysError} tDays={tDays} t={t} />
                    <ScheduleSection
                      timeEnabled={timeEnabled} setTimeEnabled={setTimeEnabled}
                      startTime={startTime} setStartTime={setStartTime}
                      estimatedMinutes={estimatedMinutes} setEstimatedMinutes={setEstimatedMinutes}
                      endTime={endTime} t={t}
                    />
                  </div>
                )}

                {/* ── Step 2: Appearance (create) ────────────────── */}
                {scene === "step2" && (
                  <AppearanceRows color={color} icon={icon} navigate={navigate} homeScene={homeScene} t={t} />
                )}

                {/* ── Edit flat view (edit mode) ─────────────────── */}
                {scene === "edit" && (
                  <div className="flex flex-col gap-4">
                    <NameField name={name} setName={setName} nameError={nameError} setNameError={setNameError} t={t} />
                    <CategoryField categories={categories} categoryId={categoryId} setCategoryId={setCategoryId} t={t} />

                    {/* Days button */}
                    <button
                      type="button"
                      onClick={() => navigate("edit_days", 1)}
                      className="w-full flex items-center justify-between px-4 py-4 rounded-[14px] transition-opacity active:opacity-70"
                      style={{ background: "var(--surface-elevated)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("days_label")}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                            {activeDays.length === 7
                              ? "L M X J V S D"
                              : activeDays.map((d) => ["L","M","X","J","V","S","D"][d - 1]).join(" ")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                    </button>

                    <ScheduleSection
                      timeEnabled={timeEnabled} setTimeEnabled={setTimeEnabled}
                      startTime={startTime} setStartTime={setStartTime}
                      estimatedMinutes={estimatedMinutes} setEstimatedMinutes={setEstimatedMinutes}
                      endTime={endTime} t={t}
                    />

                    <AppearanceRows color={color} icon={icon} navigate={navigate} homeScene={homeScene} t={t} />

                    {/* Edit save/cancel */}
                    <div className="flex gap-3 mt-2">
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

                {/* ── Edit days sub-sheet ──────────────────────────── */}
                {scene === "edit_days" && (
                  <div className="flex flex-col gap-5">
                    <DaysGrid activeDays={activeDays} toggleDay={toggleDay} daysError={daysError} tDays={tDays} t={t} />
                  </div>
                )}

                {/* ── Color sub-sheet ──────────────────────────────── */}
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

                {/* ── Icon sub-sheet ───────────────────────────────── */}
                {scene === "icon" && (
                  <div>
                    <div className="flex rounded-[12px] p-1 mb-4" style={{ background: "var(--surface-elevated)" }}>
                      {(["emoji", "svg"] as IconTab[]).map((tabType) => (
                        <button
                          key={tabType}
                          type="button"
                          onClick={() => setIconTab(tabType)}
                          className="flex-1 py-2 rounded-[8px] text-xs font-medium transition-all"
                          style={{
                            background: iconTab === tabType ? "var(--surface)" : "transparent",
                            color: iconTab === tabType ? "var(--text-primary)" : "var(--text-secondary)",
                          }}
                        >
                          {tabType === "emoji" ? t("tab_emoji") : t("tab_svg")}
                        </button>
                      ))}
                    </div>

                    {iconTab === "emoji" && (
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

                    {iconTab === "svg" && (
                      <div className="flex flex-col gap-5 pb-4">
                        {LUCIDE_CATEGORIES.map(({ label, icons }) => (
                          <div key={label}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                              {tCat(label as Parameters<typeof tCat>[0])}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {icons.map((iconName) => {
                                const IconComp = LUCIDE_ICON_MAP[iconName];
                                const iconValue = `lucide:${iconName}`;
                                const isSelected = icon === iconValue;
                                return (
                                  <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => { setIcon(isSelected ? null : iconValue); navigate(homeScene(), -1); }}
                                    className="w-12 h-12 rounded-[12px] flex items-center justify-center transition-all active:scale-90"
                                    style={{
                                      background: isSelected ? "var(--surface-elevated)" : "transparent",
                                      border: `1.5px solid ${isSelected ? "var(--btn-primary-bg)" : "var(--border)"}`,
                                      color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                                    }}
                                  >
                                    <IconComp size={22} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Wizard nav buttons (create mode only) ─────────── */}
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

                    {scene !== "step2" ? (
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

// ─── Shared sub-components ────────────────────────────────────────────────────

type TFunc = ReturnType<typeof useTranslations>;

function NameField({ name, setName, nameError, setNameError, t }: {
  name: string;
  setName: (v: string) => void;
  nameError: string;
  setNameError: (v: string) => void;
  t: TFunc;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
        {t("name_label")}
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setNameError(""); }}
        placeholder={t("name_placeholder")}
        maxLength={60}
        className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
        style={{
          background: "var(--surface-elevated)",
          color: "var(--text-primary)",
          border: nameError ? "1.5px solid #FF5252" : "1.5px solid transparent",
        }}
      />
      {nameError && <p className="text-xs mt-1.5" style={{ color: "#FF5252" }}>{nameError}</p>}
    </div>
  );
}

function CategoryField({ categories, categoryId, setCategoryId, t }: {
  categories: Category[];
  categoryId: string | null;
  setCategoryId: (v: string | null) => void;
  t: TFunc;
}) {
  if (categories.length === 0) return null;
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
        {t("category_label")}
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className="px-3 py-2 rounded-[10px] text-xs font-medium transition-all active:scale-95"
          style={{
            background: categoryId === null ? "var(--surface-elevated)" : "transparent",
            color: categoryId === null ? "var(--text-primary)" : "var(--text-secondary)",
            border: `1.5px solid ${categoryId === null ? "rgba(255,255,255,0.15)" : "var(--surface-elevated)"}`,
          }}
        >
          {t("no_category")}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className="px-3 py-2 rounded-[10px] text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
            style={{
              background: categoryId === cat.id ? (cat.color ?? "#4CAF82") + "25" : "transparent",
              color: categoryId === cat.id ? (cat.color ?? "#4CAF82") : "var(--text-secondary)",
              border: `1.5px solid ${categoryId === cat.id ? (cat.color ?? "#4CAF82") + "60" : "var(--surface-elevated)"}`,
            }}
          >
            {cat.icon && <span>{cat.icon}</span>}
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DaysGrid({ activeDays, toggleDay, daysError, tDays, t }: {
  activeDays: number[];
  toggleDay: (d: number) => void;
  daysError: string;
  tDays: ReturnType<typeof useTranslations>;
  t: TFunc;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
        {t("days_label")}
      </label>
      <div className="flex gap-2">
        {ALL_DAYS.map((day) => {
          const on = activeDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className="flex-1 py-2.5 rounded-[10px] text-xs font-semibold transition-all active:scale-95"
              style={{
                background: on ? "var(--btn-primary-bg)" : "var(--surface-elevated)",
                color: on ? "var(--btn-primary-text)" : "var(--text-secondary)",
              }}
            >
              {tDays(`d${day}` as Parameters<typeof tDays>[0])}
            </button>
          );
        })}
      </div>
      {daysError && <p className="text-xs mt-1.5" style={{ color: "#FF5252" }}>{daysError}</p>}
    </div>
  );
}

function ScheduleSection({ timeEnabled, setTimeEnabled, startTime, setStartTime, estimatedMinutes, setEstimatedMinutes, endTime, t }: {
  timeEnabled: boolean;
  setTimeEnabled: (v: boolean | ((p: boolean) => boolean)) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  estimatedMinutes: string;
  setEstimatedMinutes: (v: string) => void;
  endTime: string | null;
  t: TFunc;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center justify-between px-4 py-3 rounded-[12px]"
        style={{ background: "var(--surface-elevated)" }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {t("schedule_toggle")}
        </span>
        <button
          type="button"
          onClick={() => setTimeEnabled((v) => !v)}
          className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
          style={{ background: timeEnabled ? "#4CAF82" : "var(--border)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
            style={{ left: timeEnabled ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>

      {timeEnabled && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              {t("start_label")}
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-primary)",
                border: "1.5px solid transparent",
                colorScheme: "dark",
              }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              {t("duration_label")}
            </label>
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="30"
              min={1}
              max={480}
              className="w-full rounded-[12px] px-4 py-3 text-sm outline-none"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-primary)",
                border: "1.5px solid transparent",
              }}
            />
          </div>
          {endTime && (
            <p className="text-xs font-medium" style={{ color: "#4CAF82" }}>
              {t("ends_at", { time: endTime })}
            </p>
          )}
          <div
            className="flex items-start gap-2.5 rounded-[12px] px-3.5 py-3"
            style={{ background: "rgba(100,160,255,0.08)", border: "1px solid rgba(100,160,255,0.15)" }}
          >
            <Info size={14} className="flex-shrink-0 mt-0.5" color="#88AAFF" />
            <p className="text-xs leading-relaxed" style={{ color: "#88AAFF" }}>
              {t("lock_tooltip")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AppearanceRows({ color, icon, navigate, homeScene, t }: {
  color: string | null;
  icon: string | null;
  navigate: (to: Scene, dir: number) => void;
  homeScene: () => Scene;
  t: TFunc;
}) {
  return (
    <div className="flex flex-col gap-3">
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

      <button
        type="button"
        onClick={() => navigate("icon", 1)}
        className="w-full flex items-center justify-between px-4 py-4 rounded-[14px] transition-opacity active:opacity-70"
        style={{ background: "var(--surface-elevated)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: icon ? (color ?? "#4CAF82") + "25" : "var(--border)" }}
          >
            {icon
              ? <HabitIcon icon={icon} size={20} color={color ?? "var(--text-primary)"} />
              : <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
            }
          </div>
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("icon_label")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {icon ? (icon.startsWith("lucide:") ? icon.slice(7) : icon) : t("no_icon")}
            </p>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </button>
    </div>
  );
}
