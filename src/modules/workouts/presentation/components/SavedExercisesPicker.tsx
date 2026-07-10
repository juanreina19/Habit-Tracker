"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Search, Info, Plus } from "lucide-react";
import { Tooltip, TooltipProvider } from "@/shared/components/ui/Tooltip";
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
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const items = await searchCatalog(query);
      setResults(items);
      setLoading(false);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchCatalog]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-center">
        <Search
          size={14}
          strokeWidth={2}
          className="absolute left-3 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("exercise_name_placeholder")}
          className="w-full pl-9 pr-9 py-2 text-sm outline-none bg-transparent placeholder:text-[var(--text-muted)] placeholder:opacity-100"
          style={{ color: "var(--text-muted)" }}
        />
        <TooltipProvider>
          <Tooltip label={t("saved_search_hint")} side="top">
            <Info
              size={13}
              strokeWidth={2}
              className="absolute right-3"
              style={{ color: "var(--text-muted)" }}
            />
          </Tooltip>
        </TooltipProvider>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-1 py-2">
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-muted)" }} />
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-muted)", animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--text-muted)", animationDelay: "300ms" }} />
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>{t("no_exercises_found")}</p>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto hide-scrollbar">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item); setQuery(""); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm text-left transition-colors"
              style={{ background: "var(--bg)", color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              >
                <Plus size={10} strokeWidth={2} />
              </span>
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
