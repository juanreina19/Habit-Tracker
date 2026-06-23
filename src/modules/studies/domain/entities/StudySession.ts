import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export interface StudySession {
  id: UUID;
  subjectId: UUID;
  topicId: UUID | null;
  userId: UUID;
  durationMin: number;
  startedAt: ISOTimestamp;
  createdAt: ISOTimestamp;
}

export interface LogSessionInput {
  subjectId: UUID;
  topicId?: UUID | null;
  durationMin: number;
  startedAt: ISOTimestamp;
}
