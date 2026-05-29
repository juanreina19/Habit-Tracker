import type { SupabaseClient } from "@supabase/supabase-js";
import type { UUID, DbCategory } from "@/shared/types/database.types";
import type { ICategoryRepository, CreateCategoryInput, UpdateCategoryInput } from "../../domain/repositories/ICategoryRepository";
import type { Category } from "../../domain/entities/Category";

function mapDbToCategory(row: DbCategory): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    order: row.order,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class CategorySupabaseRepository implements ICategoryRepository {
  constructor(private readonly client: SupabaseClient<any>) {}

  async findAllByUser(userId: UUID): Promise<Category[]> {
    const { data, error } = await this.client
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("order", { ascending: true });

    if (error) throw error;
    return data.map(mapDbToCategory);
  }

  async findById(id: UUID): Promise<Category | null> {
    const { data, error } = await this.client
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return mapDbToCategory(data);
  }

  async create(userId: UUID, input: CreateCategoryInput): Promise<Category> {
    const { count } = await this.client
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data, error } = await this.client
      .from("categories")
      .insert({
        user_id: userId,
        name: input.name,
        color: input.color ?? null,
        icon: input.icon ?? null,
        order: count ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return mapDbToCategory(data);
  }

  async update(id: UUID, input: UpdateCategoryInput): Promise<Category> {
    const { data, error } = await this.client
      .from("categories")
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.order !== undefined && { order: input.order }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapDbToCategory(data);
  }

  async delete(id: UUID): Promise<void> {
    const { error } = await this.client.from("categories").delete().eq("id", id);
    if (error) throw error;
  }

  async reorder(categoryIds: UUID[]): Promise<void> {
    await Promise.all(
      categoryIds.map((id, index) =>
        this.client.from("categories").update({ order: index }).eq("id", id)
      )
    );
  }
}
