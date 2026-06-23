import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export interface Topic {
  id: UUID;
  subjectId: UUID;
  userId: UUID;
  title: string;
  order: number;
  createdAt: ISOTimestamp;
}

export interface CreateTopicInput {
  subjectId: UUID;
  title: string;
}

export interface UpdateTopicInput {
  title?: string;
  order?: number;
}
