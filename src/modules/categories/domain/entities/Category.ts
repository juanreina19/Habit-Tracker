import type { UUID, ISOTimestamp } from "@/shared/types/database.types";

export interface Category {
  id: UUID;
  userId: UUID;
  name: string;
  color: string | null;   // hex
  icon: string | null;    // nombre de icono lucide
  order: number;
  createdAt: ISOTimestamp;
}
