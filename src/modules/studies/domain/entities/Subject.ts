import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export interface Subject {
  id: UUID;
  userId: UUID;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: ISOTimestamp;
}

export interface CreateSubjectInput {
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateSubjectInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
}
