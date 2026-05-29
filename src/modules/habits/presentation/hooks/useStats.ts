"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { HabitSupabaseRepository } from "../../infrastructure/supabase/HabitSupabaseRepository";
import { AchievementSupabaseRepository } from "@/modules/achievements/infrastructure/supabase/AchievementSupabaseRepository";
import { GetStatsUseCase, type StatsData } from "../../domain/use-cases/GetStatsUseCase";
import type { UUID } from "@/shared/types/database.types";

export function useStats(userId: UUID) {
  const [data, setData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const client = createClient();
        const habitRepo = new HabitSupabaseRepository(client);
        const achievementRepo = new AchievementSupabaseRepository(client);
        const result = await new GetStatsUseCase(habitRepo, achievementRepo).execute(userId);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando estadísticas");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

  return { data, isLoading, error };
}
