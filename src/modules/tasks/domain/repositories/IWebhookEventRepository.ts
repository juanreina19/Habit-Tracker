import type { UUID } from "@/shared/types/database.types";
import type { WebhookEvent, WebhookDelivery, WebhookDeliveryAttemptResult } from "../entities/Webhook";

export interface IWebhookEventRepository {
  /** Service-role — eventos del outbox aún no procesados, usado por el cron de dispatch. */
  findPendingEvents(limit: number): Promise<WebhookEvent[]>;

  /** Marca un evento del outbox como 'delivered' o 'failed' (terminal). Service-role. */
  markEventStatus(id: UUID, status: WebhookEvent["dispatchStatus"]): Promise<void>;

  /** Un evento del outbox por id — usado por DispatchPendingWebhooksUseCase para construir el envelope. */
  findEventById(id: UUID): Promise<WebhookEvent | null>;

  /** Audit log para una futura UI de Settings — RLS-scoped al usuario. */
  findRecentByUser(userId: UUID, limit: number): Promise<WebhookEvent[]>;

  /**
   * Crea una fila de delivery 'pending' para (evento, endpoint) si no existe ya
   * (idempotente vía unique(event_id, endpoint_id)). Service-role.
   */
  createDeliveryIfMissing(eventId: UUID, endpointId: UUID, userId: UUID): Promise<void>;

  /** Deliveries con status='pending' y next_attempt_at <= now(). Service-role. */
  findDueDeliveries(limit: number): Promise<WebhookDelivery[]>;

  /** Registra el resultado de un intento de entrega y agenda el próximo (o lo marca terminal). Service-role. */
  recordDeliveryAttempt(id: UUID, result: WebhookDeliveryAttemptResult): Promise<void>;

  /** Historial de entregas de un evento concreto — RLS-scoped al usuario. */
  findDeliveriesForEvent(eventId: UUID): Promise<WebhookDelivery[]>;

  /**
   * Reinicia una entrega para reenvío manual: status='pending', attempt_count=0,
   * next_attempt_at=now(). Usado por RedeliverWebhookUseCase. Service-role.
   */
  resetDeliveryForRedelivery(id: UUID): Promise<void>;

  /** Entregas recientes de un usuario para una futura UI de Settings — RLS-scoped. */
  findRecentDeliveriesByUser(userId: UUID, limit: number): Promise<WebhookDelivery[]>;
}
