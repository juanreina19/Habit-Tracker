import type { IWebhookEventRepository } from "../repositories/IWebhookEventRepository";
import type { UUID } from "@/shared/types/database.types";

/**
 * Reintento manual de una entrega (botón "Reintentar" en una futura UI de Settings).
 * Resetea status a 'pending', attempt_count a 0 y next_attempt_at a now() para que
 * el próximo cron la recoja como vencida.
 */
export class RedeliverWebhookUseCase {
  constructor(private readonly repo: IWebhookEventRepository) {}

  async execute(deliveryId: UUID): Promise<void> {
    return this.repo.resetDeliveryForRedelivery(deliveryId);
  }
}
