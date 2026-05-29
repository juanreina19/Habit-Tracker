"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { CategorySupabaseRepository } from "../../infrastructure/supabase/CategorySupabaseRepository";
import type { Category } from "../../domain/entities/Category";
import type { CreateCategoryInput, UpdateCategoryInput } from "../../domain/repositories/ICategoryRepository";
import type { UUID } from "@/shared/types/database.types";

export function useCategories(userId: UUID) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRepo = useCallback(
    () => new CategorySupabaseRepository(createClient()),
    []
  );

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getRepo().findAllByUser(userId);
      setCategories(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  }, [userId, getRepo]);

  const create = useCallback(
    async (input: CreateCategoryInput): Promise<Category> => {
      const created = await getRepo().create(userId, input);
      setCategories((prev) => [...prev, created]);
      return created;
    },
    [userId, getRepo]
  );

  const update = useCallback(
    async (id: UUID, input: UpdateCategoryInput): Promise<Category> => {
      const updated = await getRepo().update(id, input);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [getRepo]
  );

  const remove = useCallback(
    async (id: UUID): Promise<void> => {
      await getRepo().delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    },
    [getRepo]
  );

  const reorder = useCallback(
    async (reorderedCategories: Category[]): Promise<void> => {
      setCategories(reorderedCategories);
      await getRepo().reorder(reorderedCategories.map((c) => c.id));
    },
    [getRepo]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { categories, isLoading, error, refetch: fetch, create, update, remove, reorder };
}
