import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { IWebhookEndpointRepository } from "../../domain/repositories/IWebhookEndpointRepository";
import type {
  WebhookEndpoint,
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
} from "../../domain/entities/Webhook";
import { ALL_TASK_WEBHOOK_EVENT_TYPES } from "../../domain/entities/Webhook";
import type { UUID, DbWebhookEndpoint } from "@/shared/types/database.types";

const MAX_CONSECUTIVE_FAILURES = 5;

export class WebhookEndpointSupabaseRepository implements IWebhookEndpointRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapToEntity(row: DbWebhookEndpoint): WebhookEndpoint {
    return {
      id: row.id,
      userId: row.user_id,
      url: row.url,
      description: row.description,
      secret: row.secret,
      eventTypes: row.event_types,
      isActive: row.is_active,
      createdAt: row.created_at,
      lastTriggeredAt: row.last_triggered_at,
      lastStatus: row.last_status,
      consecutiveFailures: row.consecutive_failures,
    };
  }

  async findAllByUser(userId: UUID): Promise<WebhookEndpoint[]> {
    const { data, error } = await this.client
      .from("webhook_endpoints")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as DbWebhookEndpoint[]).map(r => this.mapToEntity(r));
  }

  async findActiveForDispatch(): Promise<WebhookEndpoint[]> {
    const { data, error } = await this.client
      .from("webhook_endpoints")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    return ((data ?? []) as DbWebhookEndpoint[]).map(r => this.mapToEntity(r));
  }

  async findById(id: UUID): Promise<WebhookEndpoint | null> {
    const { data, error } = await this.client
      .from("webhook_endpoints")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToEntity(data as DbWebhookEndpoint) : null;
  }

  async create(userId: UUID, input: CreateWebhookEndpointInput): Promise<WebhookEndpoint> {
    const { data, error } = await this.client
      .from("webhook_endpoints")
      .insert({
        user_id: userId,
        url: input.url,
        description: input.description ?? null,
        secret: crypto.randomBytes(32).toString("hex"),
        event_types: input.eventTypes?.length ? input.eventTypes : ALL_TASK_WEBHOOK_EVENT_TYPES,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbWebhookEndpoint);
  }

  async update(id: UUID, input: UpdateWebhookEndpointInput): Promise<WebhookEndpoint> {
    const patch: Record<string, unknown> = {};
    if (input.url !== undefined) patch.url = input.url;
    if (input.description !== undefined) patch.description = input.description;
    if (input.eventTypes !== undefined) patch.event_types = input.eventTypes;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await this.client
      .from("webhook_endpoints")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbWebhookEndpoint);
  }

  async delete(id: UUID): Promise<void> {
    const { error } = await this.client
      .from("webhook_endpoints")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async rotateSecret(id: UUID): Promise<WebhookEndpoint> {
    const { data, error } = await this.client
      .from("webhook_endpoints")
      .update({ secret: crypto.randomBytes(32).toString("hex") })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToEntity(data as DbWebhookEndpoint);
  }

  async recordDeliveryResult(id: UUID, status: "success" | "failed"): Promise<void> {
    const { data: current, error: fetchError } = await this.client
      .from("webhook_endpoints")
      .select("consecutive_failures")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const consecutiveFailures = status === "success"
      ? 0
      : ((current as { consecutive_failures: number }).consecutive_failures ?? 0) + 1;

    const patch: Record<string, unknown> = {
      last_triggered_at: new Date().toISOString(),
      last_status: status,
      consecutive_failures: consecutiveFailures,
    };
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      patch.is_active = false;
    }

    const { error } = await this.client
      .from("webhook_endpoints")
      .update(patch)
      .eq("id", id);

    if (error) throw error;
  }
}
