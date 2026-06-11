import type { UUID } from "@/shared/types/database.types";
import type {
  WebhookEndpoint,
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
} from "../entities/Webhook";

export interface IWebhookEndpointRepository {
  /** Endpoints configurados por un usuario (RLS-scoped). */
  findAllByUser(userId: UUID): Promise<WebhookEndpoint[]>;

  /** Service-role — todos los endpoints activos de todos los usuarios, para el cron de dispatch. */
  findActiveForDispatch(): Promise<WebhookEndpoint[]>;

  /** Un endpoint por id — usado por DispatchPendingWebhooksUseCase para firmar/enviar entregas debidas. */
  findById(id: UUID): Promise<WebhookEndpoint | null>;

  create(userId: UUID, input: CreateWebhookEndpointInput): Promise<WebhookEndpoint>;

  update(id: UUID, input: UpdateWebhookEndpointInput): Promise<WebhookEndpoint>;

  delete(id: UUID): Promise<void>;

  /** Genera y persiste un nuevo secret, devolviendo el endpoint actualizado (secret en texto plano). */
  rotateSecret(id: UUID): Promise<WebhookEndpoint>;

  /**
   * Actualiza el resumen de salud denormalizado del endpoint tras un intento de entrega:
   * `last_triggered_at`, `last_status` y `consecutive_failures` (incrementa en 'failed',
   * resetea a 0 en 'success'). Si `consecutive_failures` alcanza 5, desactiva el endpoint
   * (`is_active = false`) — service role, usado por DispatchPendingWebhooksUseCase.
   */
  recordDeliveryResult(id: UUID, status: "success" | "failed"): Promise<void>;
}
