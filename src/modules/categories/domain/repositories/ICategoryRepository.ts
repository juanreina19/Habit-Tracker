import type { UUID } from "@/shared/types/database.types";
import type { Category } from "../entities/Category";

export interface CreateCategoryInput {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string | null;
  icon?: string | null;
  order?: number;
}

export interface ICategoryRepository {
  findAllByUser(userId: UUID): Promise<Category[]>;
  findById(id: UUID): Promise<Category | null>;
  create(userId: UUID, input: CreateCategoryInput): Promise<Category>;
  update(id: UUID, input: UpdateCategoryInput): Promise<Category>;
  delete(id: UUID): Promise<void>;
  reorder(categoryIds: UUID[]): Promise<void>;
}
