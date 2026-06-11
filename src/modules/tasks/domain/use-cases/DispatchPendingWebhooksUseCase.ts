import type { IWebhookEventRepository } from "../repositories/IWebhookEventRepository";
import type { IWebhookEndpointRepository } from "../repositories/IWebhookEndpointRepository";
import { buildWebhookEnvelope, signWebhookPayload } from "./lib/signWebhookPayload";

const EVENTS_BATCH_SIZE = 500;
const DELIVERIES_BATCH_SIZE = 500;
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 24 * 60 * 60 * 1000; // 1 día — granularidad del cron diario, ver plan §5.2
const RESPONSE_BODY_MAX_LENGTH = 500;

export interface DispatchStats {
  eventsProcessed: number;
  deliveriesAttempted: number;
  succeeded: number;
  failed: number;
}

/**
 * Corazón del cron diario de webhooks. Crea filas de delivery para eventos
 * pendientes del outbox (idempotente vía unique(event_id, endpoint_id)) y
 * luego intenta las entregas que ya están vencidas (next_attempt_at <= now()).
 */
export class DispatchPendingWebhooksUseCase {
  constructor(
    private readonly eventRepo: IWebhookEventRepository,
    private readonly endpointRepo: IWebhookEndpointRepository,
  ) {}

  async execute(): Promise<DispatchStats> {
    const stats: DispatchStats = { eventsProcessed: 0, deliveriesAttempted: 0, succeeded: 0, failed: 0 };

    await this.createDeliveriesForPendingEvents(stats);
    await this.attemptDueDeliveries(stats);

    return stats;
  }

  private async createDeliveriesForPendingEvents(stats: DispatchStats): Promise<void> {
    const pendingEvents = await this.eventRepo.findPendingEvents(EVENTS_BATCH_SIZE);
    if (pendingEvents.length === 0) return;

    const activeEndpoints = await this.endpointRepo.findActiveForDispatch();

    for (const event of pendingEvents) {
      const matchingEndpoints = activeEndpoints.filter(
        endpoint => endpoint.userId === event.userId && endpoint.eventTypes.includes(event.eventType)
      );

      for (const endpoint of matchingEndpoints) {
        await this.eventRepo.createDeliveryIfMissing(event.id, endpoint.id, event.userId);
      }

      await this.eventRepo.markEventStatus(event.id, "delivered");
      stats.eventsProcessed++;
    }
  }

  private async attemptDueDeliveries(stats: DispatchStats): Promise<void> {
    const dueDeliveries = await this.eventRepo.findDueDeliveries(DELIVERIES_BATCH_SIZE);

    for (const delivery of dueDeliveries) {
      const [event, endpoint] = await Promise.all([
        this.eventRepo.findEventById(delivery.eventId),
        this.endpointRepo.findById(delivery.endpointId),
      ]);

      stats.deliveriesAttempted++;

      if (!event || !endpoint || !endpoint.isActive) {
        await this.eventRepo.recordDeliveryAttempt(delivery.id, {
          status: "failed",
          responseStatus: null,
          responseBody: "Endpoint inactivo o evento no encontrado",
          nextAttemptAt: null,
        });
        stats.failed++;
        continue;
      }

      const envelope = buildWebhookEnvelope(event);
      const signed = signWebhookPayload(envelope, endpoint.secret);

      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let outcome: "success" | "retryable" | "terminal_failure";

      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: signed.headers,
          body: signed.body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        responseStatus = response.status;
        responseBody = (await response.text()).slice(0, RESPONSE_BODY_MAX_LENGTH);

        if (response.status >= 200 && response.status < 300) {
          outcome = "success";
        } else if (response.status === 408 || response.status === 429 || response.status >= 500) {
          outcome = "retryable";
        } else {
          outcome = "terminal_failure";
        }
      } catch (error) {
        responseBody = (error instanceof Error ? error.message : "Network error").slice(0, RESPONSE_BODY_MAX_LENGTH);
        outcome = "retryable";
      }

      const willExceedMaxAttempts = delivery.attemptCount + 1 >= MAX_ATTEMPTS;

      if (outcome === "success") {
        await this.eventRepo.recordDeliveryAttempt(delivery.id, {
          status: "success",
          responseStatus,
          responseBody,
          nextAttemptAt: null,
        });
        await this.endpointRepo.recordDeliveryResult(endpoint.id, "success");
        stats.succeeded++;
      } else if (outcome === "terminal_failure" || willExceedMaxAttempts) {
        await this.eventRepo.recordDeliveryAttempt(delivery.id, {
          status: "failed",
          responseStatus,
          responseBody,
          nextAttemptAt: null,
        });
        await this.endpointRepo.recordDeliveryResult(endpoint.id, "failed");
        stats.failed++;
      } else {
        await this.eventRepo.recordDeliveryAttempt(delivery.id, {
          status: "pending",
          responseStatus,
          responseBody,
          nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
        });
        stats.failed++;
      }
    }
  }
}
