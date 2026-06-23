import type { SupabaseClient } from "@supabase/supabase-js";
import type { UUID, DbSubject, DbTopic, DbStudySession } from "@/shared/types/database.types";
import type { IStudiesRepository } from "../../domain/repositories/IStudiesRepository";
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from "../../domain/entities/Subject";
import type { Topic, CreateTopicInput, UpdateTopicInput } from "../../domain/entities/Topic";
import type { StudySession, LogSessionInput } from "../../domain/entities/StudySession";

function mapSubject(row: DbSubject): Subject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
  };
}

function mapTopic(row: DbTopic): Topic {
  return {
    id: row.id,
    subjectId: row.subject_id,
    userId: row.user_id,
    title: row.title,
    order: row.order,
    createdAt: row.created_at,
  };
}

function mapSession(row: DbStudySession): StudySession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    userId: row.user_id,
    durationMin: row.duration_min,
    startedAt: row.started_at,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class StudiesSupabaseRepository implements IStudiesRepository {
  constructor(private readonly client: SupabaseClient<any>) {}

  // ── Subjects ───────────────────────────────────────────────────────────────

  async findSubjectsByUser(userId: UUID): Promise<Subject[]> {
    const { data, error } = await this.client
      .from("subjects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapSubject);
  }

  async createSubject(userId: UUID, input: CreateSubjectInput): Promise<Subject> {
    const { data, error } = await this.client
      .from("subjects")
      .insert({
        user_id: userId,
        name: input.name.trim(),
        icon: input.icon ?? null,
        color: input.color ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSubject(data);
  }

  async updateSubject(id: UUID, input: UpdateSubjectInput): Promise<Subject> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.color !== undefined) patch.color = input.color;

    const { data, error } = await this.client
      .from("subjects")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapSubject(data);
  }

  async deleteSubject(id: UUID): Promise<void> {
    const { error } = await this.client.from("subjects").delete().eq("id", id);
    if (error) throw error;
  }

  // ── Topics ─────────────────────────────────────────────────────────────────

  async findTopicsBySubject(subjectId: UUID): Promise<Topic[]> {
    const { data, error } = await this.client
      .from("topics")
      .select("*")
      .eq("subject_id", subjectId)
      .order("order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTopic);
  }

  async createTopic(userId: UUID, input: CreateTopicInput): Promise<Topic> {
    const { count } = await this.client
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", input.subjectId);

    const { data, error } = await this.client
      .from("topics")
      .insert({
        subject_id: input.subjectId,
        user_id: userId,
        title: input.title.trim(),
        order: count ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return mapTopic(data);
  }

  async updateTopic(id: UUID, input: UpdateTopicInput): Promise<Topic> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.order !== undefined) patch.order = input.order;

    const { data, error } = await this.client
      .from("topics")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapTopic(data);
  }

  async deleteTopic(id: UUID): Promise<void> {
    const { error } = await this.client.from("topics").delete().eq("id", id);
    if (error) throw error;
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  async findSessionsByUser(userId: UUID): Promise<StudySession[]> {
    const { data, error } = await this.client
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSession);
  }

  async logSession(userId: UUID, input: LogSessionInput): Promise<StudySession> {
    const { data, error } = await this.client
      .from("study_sessions")
      .insert({
        user_id: userId,
        subject_id: input.subjectId,
        topic_id: input.topicId ?? null,
        duration_min: input.durationMin,
        started_at: input.startedAt,
      })
      .select()
      .single();
    if (error) throw error;
    return mapSession(data);
  }
}
