"use client";

import { useState, useRef, useEffect } from "react";
import type { ExerciseCatalogItem } from "../../domain/entities/WorkoutExercise";

interface Props {
  value: string;
  onChange: (name: string) => void;
  onSelectSuggestion: (item: ExerciseCatalogItem) => void;
  searchCatalog: (query: string) => Promise<ExerciseCatalogItem[]>;
  placeholder?: string;
}

/**
 * Input con autocompletado del catálogo de ejercicios del usuario — un solo
 * sitio de uso (dentro de WorkoutFormDialog), se mantiene como componente
 * propio para no engordar más ese archivo.
 */
export function ExerciseCatalogAutocomplete({ value, onChange, onSelectSuggestion, searchCatalog, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<ExerciseCatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  const handleChange = (next: string) => {
    onChange(next);
    clearTimeout(debounceRef.current);
    if (!next.trim()) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCatalog(next);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 250);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none"
        style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1.5px solid transparent" }}
      />
      {open && (
        <div
          className="absolute z-20 left-0 right-0 mt-1 rounded-lg py-1.5 shadow-lg max-h-48 overflow-y-auto hide-scrollbar"
          style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        >
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelectSuggestion(item); setOpen(false); }}
              className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
