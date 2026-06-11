import type { IWebhookEndpointRepository } from "../repositories/IWebhookEndpointRepository";
import type { UUID } from "@/shared/types/database.types";
import type { WebhookEndpoint } from "../entities/Webhook";

/**
 * Rota el secret de un endpoint. El secret anterior deja de validar
 * inmediatamente; la firma de entregas usa el secret vigente al momento
 * del envío. El plaintext del nuevo secret se devuelve en el resultado
 * para mostrarse al usuario una sola vez.
 */
export class RotateWebhookSecretUseCase {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async execute(id: UUID): Promise<WebhookEndpoint> {
    return this.repo.rotateSecret(id);
  }
}
