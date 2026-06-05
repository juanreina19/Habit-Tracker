"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { HabitIcon } from "@/shared/components/ui/HabitIcon";
import { useSettingsHabits } from "../../hooks/useSettingsHabits";
import { useHabitStore } from "../../store/habitStore";
import { refreshTodayHabitsInStore } from "../../hooks/useHabits";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { HabitFormDialog } from "../settings/HabitFormDialog";
import { CategoryFormDialog } from "@/modules/categories/presentation/components/CategoryFormDialog";
import type { Habit } from "../../../domain/entities/Habit";
import type { CreateHabitInput, UpdateHabitInput } from "../../../domain/repositories/IHabitRepository";
import type { Category } from "@/modules/categories/domain/entities/Category";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/modules/categories/domain/repositories/ICategoryRepository";
import type { UUID } from "@/shared/types/database.types";

type Tab = "habits" | "categories";

interface Props {
  userId: UUID;
}

export default function HabitsView({ userId }: Props) {
  const t = useTranslations("habits");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("habits");

  const {
    habits, isLoading: habitsLoading, create: createHabit,
    update: updateHabit, deactivate, reorder: reorderHabits,
  } = useSettingsHabits(userId);

  const {
    categories, isLoading: catsLoading, create: createCategory,
    update: updateCategory, remove: removeCategory, reorder: reorderCategories,
  } = useCategories(userId);

  const [habitDialog, setHabitDialog] = useState<{ open: boolean; habit: Habit | null }>({
    open: false, habit: null,
  });

  const [catDialog, setCatDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false, category: null,
  });

  const [confirmDelete, setConfirmDelete] = useState<
    { type: "habit"; id: UUID; name: string } | { type: "category"; id: UUID; name: string } | null
  >(null);

  const handleSaveHabit = async (data: CreateHabitInput | UpdateHabitInput) => {
    if (habitDialog.habit) {
      await updateHabit(habitDialog.habit.id, data as UpdateHabitInput);
    } else {
      await createHabit(data as CreateHabitInput);
    }
    await refreshTodayHabitsInStore(userId);
    router.refresh();
  };

  const handleSaveCategory = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    if (catDialog.category) {
      await updateCategory(catDialog.category.id, data as UpdateCategoryInput);
    } else {
      await createCategory(data as CreateCategoryInput);
    }
    await refreshTodayHabitsInStore(userId);
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "habit") {
      await deactivate(confirmDelete.id);
    } else {
      await removeCategory(confirmDelete.id);
    }
    setConfirmDelete(null);
    await refreshTodayHabitsInStore(userId);
    router.refresh();
  };

  const isLoading = habitsLoading || catsLoading;

  return (
    <div className="px-5 pt-14 pb-8 max-w-lg mx-auto lg:pt-8 lg:px-10 lg:max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("manage")}</p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-[14px] p-1 mb-6" style={{ background: "var(--surface)" }}>
        {(["habits", "categories"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-medium transition-all"
            style={{
              background: tab === tabKey ? "var(--surface-elevated)" : "transparent",
              color: tab === tabKey ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {tabKey === "habits" ? t("tab_habits") : t("tab_categories")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <HabitsSkeleton />
      ) : tab === "habits" ? (
        <HabitsTab
          habits={habits}
          categories={categories}
          onAdd={() => setHabitDialog({ open: true, habit: null })}
          onEdit={(h) => setHabitDialog({ open: true, habit: h })}
          onDelete={(h) => setConfirmDelete({ type: "habit", id: h.id, name: h.name })}
          onReorder={reorderHabits}
        />
      ) : (
        <CategoriesTab
          categories={categories}
          habitCount={habits.reduce<Record<string, number>>((acc, h) => {
            if (h.categoryId) acc[h.categoryId] = (acc[h.categoryId] ?? 0) + 1;
            return acc;
          }, {})}
          onAdd={() => setCatDialog({ open: true, category: null })}
          onEdit={(c) => setCatDialog({ open: true, category: c })}
          onDelete={(c) => setConfirmDelete({ type: "category", id: c.id, name: c.name })}
          onReorder={reorderCategories}
        />
      )}

      <HabitFormDialog
        open={habitDialog.open}
        onClose={() => setHabitDialog({ open: false, habit: null })}
        habit={habitDialog.habit}
        categories={categories}
        onSave={handleSaveHabit}
      />

      <CategoryFormDialog
        open={catDialog.open}
        onClose={() => setCatDialog({ open: false, category: null })}
        category={catDialog.category}
        onSave={handleSaveCategory}
      />

      {confirmDelete && (
        <DeleteConfirmDialog
          name={confirmDelete.name}
          type={confirmDelete.type}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ─── HabitsTab ────────────────────────────────────────────────────────────────

function HabitsTab({
  habits, categories, onAdd, onEdit, onDelete, onReorder,
}: {
  habits: Habit[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (h: Habit) => void;
  onDelete: (h: Habit) => void;
  onReorder: (items: Habit[]) => void;
}) {
  const t = useTranslations("habits");
  const [localHabits, setLocalHabits] = useState(habits);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  useEffect(() => { setLocalHabits(habits); }, [habits]);

  const handleReorder = (newOrder: Habit[]) => {
    setLocalHabits(newOrder);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onReorder(newOrder), 600);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("count", { count: localHabits.length })}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-sm font-semibold transition-opacity active:opacity-70"
          style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
        >
          <span className="text-base leading-none">+</span> {t("new_habit")}
        </button>
      </div>

      {localHabits.length === 0 ? (
        <EmptyState message={t("no_habits")} hint={t("no_habits_hint")} />
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={localHabits}
          onReorder={handleReorder}
          className="flex flex-col gap-2"
        >
          {localHabits.map((habit) => {
            const cat = habit.categoryId ? catMap.get(habit.categoryId) : null;
            const accentColor = habit.color ?? cat?.color ?? "#4CAF82";
            return (
              <HabitReorderItem
                key={habit.id}
                habit={habit}
                accentColor={accentColor}
                cat={cat ?? null}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })}
        </Reorder.Group>
      )}
    </div>
  );
}

function HabitReorderItem({
  habit, accentColor, cat, onEdit, onDelete,
}: {
  habit: Habit;
  accentColor: string;
  cat: Category | null;
  onEdit: (h: Habit) => void;
  onDelete: (h: Habit) => void;
}) {
  const tHabit = useTranslations("habits");
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={habit}
      dragControls={dragControls}
      dragListener={false}
      className="rounded-[16px] p-4 flex items-center gap-3 touch-none"
      style={{ background: "var(--surface)" }}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: "#444444" }}
      >
        <GripVertical size={18} />
      </div>
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: accentColor + "25", color: accentColor }}
      >
        <HabitIcon icon={habit.icon ?? cat?.icon ?? "🎯"} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{habit.name}</p>
          {cat && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-[6px] flex-shrink-0 whitespace-nowrap"
              style={{ background: (cat.color ?? "#8888AA") + "22", color: cat.color ?? "#8888AA" }}
            >
              {cat.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {habit.activeDays.map((d) => ["L","M","X","J","V","S","D"][d - 1]).join(" ")}
          </span>
          {habit.estimatedMinutes && (
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{habit.estimatedMinutes} min</span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <IconButton onClick={() => onEdit(habit)} label={tHabit("edit")}>
          <Pencil size={14} />
        </IconButton>
        <IconButton onClick={() => onDelete(habit)} label={tHabit("delete")} danger>
          <Trash2 size={14} />
        </IconButton>
      </div>
    </Reorder.Item>
  );
}

// ─── CategoriesTab ────────────────────────────────────────────────────────────

function CategoriesTab({
  categories, habitCount, onAdd, onEdit, onDelete, onReorder,
}: {
  categories: Category[];
  habitCount: Record<string, number>;
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onReorder: (items: Category[]) => void;
}) {
  const t = useTranslations("habits");
  const [localCats, setLocalCats] = useState(categories);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalCats(categories); }, [categories]);

  const handleReorder = (newOrder: Category[]) => {
    setLocalCats(newOrder);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onReorder(newOrder), 600);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("count_categories", { count: localCats.length })}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-sm font-semibold transition-opacity active:opacity-70"
          style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
        >
          <span className="text-base leading-none">+</span> {t("new_category")}
        </button>
      </div>

      {localCats.length === 0 ? (
        <EmptyState message={t("no_categories")} hint={t("no_categories_hint")} />
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={localCats}
          onReorder={handleReorder}
          className="flex flex-col gap-2"
        >
          {localCats.map((cat) => (
            <CategoryReorderItem
              key={cat.id}
              cat={cat}
              habitCount={habitCount[cat.id] ?? 0}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

function CategoryReorderItem({
  cat, habitCount, onEdit, onDelete,
}: {
  cat: Category;
  habitCount: number;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const tCat = useTranslations("habits");
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={cat}
      dragControls={dragControls}
      dragListener={false}
      className="rounded-[16px] p-4 flex items-center gap-3 touch-none"
      style={{ background: "var(--surface)" }}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        style={{ color: "#444444" }}
      >
        <GripVertical size={18} />
      </div>
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: (cat.color ?? "#8888AA") + "25" }}
      >
        {cat.icon ?? "📁"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{cat.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {habitCount} {habitCount === 1 ? "hábito" : "hábitos"}
        </p>
      </div>
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color ?? "#8888AA" }} />
      <div className="flex gap-1">
        <IconButton onClick={() => onEdit(cat)} label={tCat("edit")}>
          <Pencil size={14} />
        </IconButton>
        <IconButton onClick={() => onDelete(cat)} label={tCat("delete")} danger>
          <Trash2 size={14} />
        </IconButton>
      </div>
    </Reorder.Item>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function IconButton({
  onClick, label, children, danger = false,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-opacity active:opacity-60"
      style={{
        background: danger ? "#FF525215" : "var(--surface-elevated)",
        color: danger ? "#FF5252" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="rounded-[20px] p-10 text-center" style={{ background: "var(--surface)" }}>
      <p className="text-4xl mb-3">✨</p>
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{message}</p>
      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{hint}</p>
    </div>
  );
}

function DeleteConfirmDialog({
  name, type, onConfirm, onCancel,
}: {
  name: string;
  type: "habit" | "category";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("habits");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-[24px] p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          {type === "habit" ? t("delete_habit_title") : t("delete_category_title")}
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {t("delete_confirm", { name })}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-[14px] text-sm font-medium"
            style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
          >
            {t("delete_cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-[14px] text-sm font-semibold disabled:opacity-50"
            style={{ background: "#FF5252", color: "#FFFFFF" }}
          >
            {t("delete_confirm_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

function HabitsSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[16px] h-16" style={{ background: "var(--surface)" }} />
      ))}
    </div>
  );
}
