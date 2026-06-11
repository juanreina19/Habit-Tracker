import type { SupabaseClient } from "@supabase/supabase-js";
import type { IWebhookEventRepository } from "../../domain/repositories/IWebhookEventRepository";
import type { WebhookEvent, WebhookDelivery, WebhookDeliveryAttemptResult } from "../../domain/entities/Webhook";
import type { UUID, DbWebhookEvent, DbWebhookDelivery } from "@/shared/types/database.types";

export class WebhookEventSupabaseRepository implements IWebhookEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  private mapEvent(row: DbWebhookEvent): WebhookEvent {
    return {
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      taskId: row.task_id,
      payload: row.payload,
      createdAt: row.created_at,
      dispatchStatus: row.dispatch_status,
    };
  }

  private mapDelivery(row: DbWebhookDelivery): WebhookDelivery {
    return {
      id: row.id,
      eventId: row.event_id,
      endpointId: row.endpoint_id,
      userId: row.user_id,
      status: row.status,
      attemptCount: row.attempt_count,
      lastAttemptAt: row.last_attempt_at,
      nextAttemptAt: row.next_attempt_at,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      createdAt: row.created_at,
    };
  }

  async findPendingEvents(limit: number): Promise<WebhookEvent[]> {
    const { data, error } = await this.client
      .from("webhook_events")
      .select("*")
      .eq("dispatch_status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as DbWebhookEvent[]).map(r => this.mapEvent(r));
  }

  async markEventStatus(id: UUID, status: WebhookEvent["dispatchStatus"]): Promise<void> {
    const { error } = await this.client
      .from("webhook_events")
      .update({ dispatch_status: status })
      .eq("id", id);

    if (error) throw error;
  }

  async findEventById(id: UUID): Promise<WebhookEvent | null> {
    const { data, error } = await this.client
      .from("webhook_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapEvent(data as DbWebhookEvent) : null;
  }

  async findRecentByUser(userId: UUID, limit: number): Promise<WebhookEvent[]> {
    const { data, error } = await this.client
      .from("webhook_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as DbWebhookEvent[]).map(r => this.mapEvent(r));
  }

  async createDeliveryIfMissing(eventId: UUID, endpointId: UUID, userId: UUID): Promise<void> {
    const { error } = await this.client
      .from("webhook_deliveries")
      .upsert(
        { event_id: eventId, endpoint_id: endpointId, user_id: userId },
        { onConflict: "event_id,endpoint_id", ignoreDuplicates: true }
      );

    if (error) throw error;
  }

  async findDueDeliveries(limit: number): Promise<WebhookDelivery[]> {
    const { data, error } = await this.client
      .from("webhook_deliveries")
      .select("*")
      .eq("status", "pending")
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as DbWebhookDelivery[]).map(r => this.mapDelivery(r));
  }

  async recordDeliveryAttempt(id: UUID, result: WebhookDeliveryAttemptResult): Promise<void> {
    const { data: current, error: fetchError } = await this.client
      .from("webhook_deliveries")
      .select("attempt_count")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await this.client
      .from("webhook_deliveries")
      .update({
        status: result.status,
        attempt_count: ((current as { attempt_count: number }).attempt_count ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
        next_attempt_at: result.nextAttemptAt ?? new Date().toISOString(),
        response_status: result.responseStatus,
        response_body: result.responseBody,
      })
      .eq("id", id);

    if (error) throw error;
  }

  async resetDeliveryForRedelivery(id: UUID): Promise<void> {
    const { error } = await this.client
      .from("webhook_deliveries")
      .update({
        status: "pending",
        attempt_count: 0,
        next_attempt_at: new Date().toISOString(),
        response_status: null,
        response_body: null,
      })
      .eq("id", id);

    if (error) throw error;
  }

  async findDeliveriesForEvent(eventId: UUID): Promise<WebhookDelivery[]> {
    const { data, error } = await this.client
      .from("webhook_deliveries")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as DbWebhookDelivery[]).map(r => this.mapDelivery(r));
  }

  async findRecentDeliveriesByUser(userId: UUID, limit: number): Promise<WebhookDelivery[]> {
    const { data, error } = await this.client
      .from("webhook_deliveries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as DbWebhookDelivery[]).map(r => this.mapDelivery(r));
  }
}
