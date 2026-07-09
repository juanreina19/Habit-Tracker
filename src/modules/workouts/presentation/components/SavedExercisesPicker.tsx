"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseCatalogItem } from "../../domain/entities/WorkoutExercise";

interface Props {
  searchCatalog: (query: string) => Promise<ExerciseCatalogItem[]>;
  onSelect: (item: ExerciseCatalogItem) => void;
}

/**
 * Modo "Guardados" del flujo de agregar ejercicio — lista buscable inline
 * (no un dropdown flotante mientras se escribe, a diferencia del
 * ExerciseCatalogAutocomplete anterior): click en un ítem lo agrega de
 * inmediato con sus valores por defecto.
 */
export function SavedExercisesPicker({ searchCatalog, onSelect }: Props) {
  const t = useTranslations("workouts");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseCatalogItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setResults(await searchCatalog(query));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchCatalog]);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("exercise_name_placeholder")}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
      />
      {results.length > 0 && (
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto hide-scrollbar">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex items-center w-full px-3 py-2 rounded-md text-sm text-left transition-colors"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
