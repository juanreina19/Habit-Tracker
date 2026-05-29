"use client";

import { useState } from "react";
import { useSettingsHabits } from "../../hooks/useSettingsHabits";
import { useCategories } from "@/modules/categories/presentation/hooks/useCategories";
import { HabitFormDialog } from "./HabitFormDialog";
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

export default function SettingsView({ userId }: Props) {
  const [tab, setTab] = useState<Tab>("habits");

  const {
    habits, isLoading: habitsLoading, create: createHabit,
    update: updateHabit, deactivate,
  } = useSettingsHabits(userId);

  const {
    categories, isLoading: catsLoading, create: createCategory,
    update: updateCategory, remove: removeCategory,
  } = useCategories(userId);

  // Habit dialog state
  const [habitDialog, setHabitDialog] = useState<{ open: boolean; habit: Habit | null }>({
    open: false, habit: null,
  });

  // Category dialog state
  const [catDialog, setCatDialog] = useState<{ open: boolean; category: Category | null }>({
    open: false, category: null,
  });

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState<
    { type: "habit"; id: UUID; name: string } | { type: "category"; id: UUID; name: string } | null
  >(null);

  const handleSaveHabit = async (data: CreateHabitInput | UpdateHabitInput) => {
    if (habitDialog.habit) {
      await updateHabit(habitDialog.habit.id, data as UpdateHabitInput);
    } else {
      await createHabit(data as CreateHabitInput);
    }
  };

  const handleSaveCategory = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    if (catDialog.category) {
      await updateCategory(catDialog.category.id, data as UpdateCategoryInput);
    } else {
      await createCategory(data as CreateCategoryInput);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "habit") {
      await deactivate(confirmDelete.id);
    } else {
      await removeCategory(confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  const isLoading = habitsLoading || catsLoading;

  return (
    <div className="px-5 pt-14 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <h1 className="text-3xl font-semibold mb-6" style={{ color: "#FFFFFF" }}>Ajustes</h1>

      {/* Tabs */}
      <div
        className="flex rounded-[14px] p-1 mb-6"
        style={{ background: "#111111" }}
      >
        {(["habits", "categories"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-medium transition-all"
            style={{
              background: tab === t ? "#1C1C1C" : "transparent",
              color: tab === t ? "#FFFFFF" : "#8888AA",
            }}
          >
            {t === "habits" ? "Hábitos" : "Categorías"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SettingsSkeleton />
      ) : tab === "habits" ? (
        <HabitsTab
          habits={habits}
          categories={categories}
          onAdd={() => setHabitDialog({ open: true, habit: null })}
          onEdit={(h) => setHabitDialog({ open: true, habit: h })}
          onDelete={(h) => setConfirmDelete({ type: "habit", id: h.id, name: h.name })}
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
        />
      )}

      {/* Habit form dialog */}
      <HabitFormDialog
        open={habitDialog.open}
        onClose={() => setHabitDialog({ open: false, habit: null })}
        habit={habitDialog.habit}
        categories={categories}
        onSave={handleSaveHabit}
      />

      {/* Category form dialog */}
      <CategoryFormDialog
        open={catDialog.open}
        onClose={() => setCatDialog({ open: false, category: null })}
        category={catDialog.category}
        onSave={handleSaveCategory}
      />

      {/* Delete confirmation */}
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
  habits, categories, onAdd, onEdit, onDelete,
}: {
  habits: Habit[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (h: Habit) => void;
  onDelete: (h: Habit) => void;
}) {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "#8888AA" }}>
          {habits.length} {habits.length === 1 ? "hábito" : "hábitos"}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-sm font-semibold transition-opacity active:opacity-70"
          style={{ background: "#FFFFFF", color: "#000000" }}
        >
          <span className="text-base leading-none">+</span> Nuevo hábito
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState message="Sin hábitos aún" hint='Toca el botón + Nuevo hábito para empezar.' />
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map((habit) => {
            const cat = habit.categoryId ? catMap.get(habit.categoryId) : null;
            const accentColor = habit.color ?? cat?.color ?? "#4CAF82";
            return (
              <div
                key={habit.id}
                className="rounded-[16px] p-4 flex items-center gap-3"
                style={{ background: "#111111" }}
              >
                {/* Color dot + icon */}
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: accentColor + "25" }}
                >
                  {habit.icon ?? (cat?.icon ?? "🎯")}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "#FFFFFF" }}>{habit.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cat && (
                      <span className="text-xs" style={{ color: cat.color ?? "#8888AA" }}>
                        {cat.name}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "#8888AA" }}>
                      {habit.activeDays.map((d) => ["L","M","X","J","V","S","D"][d - 1]).join(" ")}
                    </span>
                    {habit.estimatedMinutes && (
                      <span className="text-xs" style={{ color: "#8888AA" }}>
                        {habit.estimatedMinutes} min
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <IconButton onClick={() => onEdit(habit)} label="Editar">
                    ✏️
                  </IconButton>
                  <IconButton onClick={() => onDelete(habit)} label="Eliminar" danger>
                    🗑️
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CategoriesTab ────────────────────────────────────────────────────────────

function CategoriesTab({
  categories, habitCount, onAdd, onEdit, onDelete,
}: {
  categories: Category[];
  habitCount: Record<string, number>;
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "#8888AA" }}>
          {categories.length} {categories.length === 1 ? "categoría" : "categorías"}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-sm font-semibold transition-opacity active:opacity-70"
          style={{ background: "#FFFFFF", color: "#000000" }}
        >
          <span className="text-base leading-none">+</span> Nueva categoría
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState message="Sin categorías aún" hint="Organiza tus hábitos con categorías de colores." />
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((cat) => {
            const count = habitCount[cat.id] ?? 0;
            return (
              <div
                key={cat.id}
                className="rounded-[16px] p-4 flex items-center gap-3"
                style={{ background: "#111111" }}
              >
                {/* Color + icon */}
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: (cat.color ?? "#8888AA") + "25" }}
                >
                  {cat.icon ?? "📁"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "#FFFFFF" }}>{cat.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8888AA" }}>
                    {count} {count === 1 ? "hábito" : "hábitos"}
                  </p>
                </div>

                {/* Color swatch */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: cat.color ?? "#8888AA" }}
                />

                {/* Actions */}
                <div className="flex gap-1">
                  <IconButton onClick={() => onEdit(cat)} label="Editar">
                    ✏️
                  </IconButton>
                  <IconButton onClick={() => onDelete(cat)} label="Eliminar" danger>
                    🗑️
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
      className="w-8 h-8 rounded-[8px] flex items-center justify-center text-sm transition-opacity active:opacity-60"
      style={{ background: danger ? "#FF525215" : "#1C1C1C" }}
    >
      {children}
    </button>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div
      className="rounded-[20px] p-10 text-center"
      style={{ background: "#111111" }}
    >
      <p className="text-4xl mb-3">✨</p>
      <p className="font-medium" style={{ color: "#FFFFFF" }}>{message}</p>
      <p className="text-sm mt-1" style={{ color: "#8888AA" }}>{hint}</p>
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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-lg rounded-[24px] p-6"
        style={{ background: "#111111" }}
      >
        <p className="text-lg font-semibold mb-2" style={{ color: "#FFFFFF" }}>
          ¿Eliminar {type === "habit" ? "hábito" : "categoría"}?
        </p>
        <p className="text-sm mb-6" style={{ color: "#8888AA" }}>
          <span style={{ color: "#FFFFFF" }}>{name}</span>
          {type === "category"
            ? " será eliminada. Los hábitos asignados quedarán sin categoría."
            : " será eliminado permanentemente."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-[14px] text-sm font-medium"
            style={{ background: "#1C1C1C", color: "#8888AA" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-[14px] text-sm font-semibold disabled:opacity-50"
            style={{ background: "#FF5252", color: "#FFFFFF" }}
          >
            {isDeleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[16px] h-16" style={{ background: "#111111" }} />
      ))}
    </div>
  );
}
