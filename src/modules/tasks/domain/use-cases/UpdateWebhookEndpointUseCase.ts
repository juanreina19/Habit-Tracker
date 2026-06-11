import type { IWebhookEndpointRepository } from "../repositories/IWebhookEndpointRepository";
import type { UUID } from "@/shared/types/database.types";
import type { WebhookEndpoint, UpdateWebhookEndpointInput } from "../entities/Webhook";
import { validateWebhookUrl } from "./lib/validateWebhookUrl";

export class UpdateWebhookEndpointUseCase {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async execute(id: UUID, input: UpdateWebhookEndpointInput): Promise<WebhookEndpoint> {
    if (input.url !== undefined) validateWebhookUrl(input.url);
    return this.repo.update(id, input);
  }
}
