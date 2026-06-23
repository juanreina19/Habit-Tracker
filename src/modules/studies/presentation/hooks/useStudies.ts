"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { StudiesSupabaseRepository } from "../../infrastructure/supabase/StudiesSupabaseRepository";
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from "../../domain/entities/Subject";
import type { Topic, CreateTopicInput, UpdateTopicInput } from "../../domain/entities/Topic";
import type { StudySession, LogSessionInput } from "../../domain/entities/StudySession";
import type { UUID } from "@/shared/types/database.types";

export function useStudies(userId: UUID) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<Record<string, Topic[]>>({});
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getRepo = useCallback(() => new StudiesSupabaseRepository(createClient()), []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subs, sess] = await Promise.all([
        getRepo().findSubjectsByUser(userId),
        getRepo().findSessionsByUser(userId),
      ]);
      setSubjects(subs);
      setSessions(sess);
    } catch {
      // silent — will show empty state
    } finally {
      setIsLoading(false);
    }
  }, [userId, getRepo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Subjects ───────────────────────────────────────────────────────────────

  const createSubject = useCallback(async (input: CreateSubjectInput) => {
    const created = await getRepo().createSubject(userId, input);
    setSubjects((prev) => [...prev, created]);
    return created;
  }, [userId, getRepo]);

  const updateSubject = useCallback(async (id: UUID, input: UpdateSubjectInput) => {
    const updated = await getRepo().updateSubject(id, input);
    setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, [getRepo]);

  const deleteSubject = useCallback(async (id: UUID) => {
    await getRepo().deleteSubject(id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopicsBySubject((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [getRepo]);

  // ── Topics ─────────────────────────────────────────────────────────────────

  const loadTopics = useCallback(async (subjectId: UUID) => {
    const topics = await getRepo().findTopicsBySubject(subjectId);
    setTopicsBySubject((prev) => ({ ...prev, [subjectId]: topics }));
  }, [getRepo]);

  const createTopic = useCallback(async (input: CreateTopicInput) => {
    const created = await getRepo().createTopic(userId, input);
    setTopicsBySubject((prev) => ({
      ...prev,
      [input.subjectId]: [...(prev[input.subjectId] ?? []), created],
    }));
    return created;
  }, [userId, getRepo]);

  const updateTopic = useCallback(async (id: UUID, subjectId: UUID, input: UpdateTopicInput) => {
    const updated = await getRepo().updateTopic(id, input);
    setTopicsBySubject((prev) => ({
      ...prev,
      [subjectId]: (prev[subjectId] ?? []).map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  }, [getRepo]);

  const deleteTopic = useCallback(async (id: UUID, subjectId: UUID) => {
    await getRepo().deleteTopic(id);
    setTopicsBySubject((prev) => ({
      ...prev,
      [subjectId]: (prev[subjectId] ?? []).filter((t) => t.id !== id),
    }));
  }, [getRepo]);

  // ── Sessions ───────────────────────────────────────────────────────────────

  const logSession = useCallback(async (input: LogSessionInput) => {
    const created = await getRepo().logSession(userId, input);
    setSessions((prev) => [created, ...prev]);
    return created;
  }, [userId, getRepo]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalMin = sessions.reduce((acc, s) => acc + s.durationMin, 0);
    const totalHours = Math.round((totalMin / 60) * 10) / 10;
    const totalSessions = sessions.length;

    // Streak: consecutive days with sessions, counting back from today
    const sessionDays = new Set(
      sessions.map((s) => s.startedAt.slice(0, 10))
    );
    let streak = 0;
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().slice(0, 10);
      if (sessionDays.has(dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    // Heatmap data: last 84 days (12 weeks)
    const heatmap: { date: string; count: number }[] = [];
    const sessionCountByDate = new Map<string, number>();
    for (const s of sessions) {
      const date = s.startedAt.slice(0, 10);
      sessionCountByDate.set(date, (sessionCountByDate.get(date) ?? 0) + 1);
    }
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dateStr = day.toISOString().slice(0, 10);
      heatmap.push({ date: dateStr, count: sessionCountByDate.get(dateStr) ?? 0 });
    }

    return { totalHours, totalSessions, streak, heatmap };
  }, [sessions]);

  return {
    subjects,
    topicsBySubject,
    sessions,
    isLoading,
    stats,
    createSubject,
    updateSubject,
    deleteSubject,
    loadTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    logSession,
    refetch: fetchAll,
  };
}
