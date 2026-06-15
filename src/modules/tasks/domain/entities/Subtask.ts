import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export interface Subtask {
  id:          UUID;
  taskId:      UUID;
  userId:      UUID;
  title:       string;
  isCompleted: boolean;
  order:       number;
  createdAt:   ISOTimestamp;
}

export interface CreateSubtaskInput {
  title: string;
}

export interface UpdateSubtaskInput {
  title?:       string;
  isCompleted?: boolean;
  order?:       number;
}
