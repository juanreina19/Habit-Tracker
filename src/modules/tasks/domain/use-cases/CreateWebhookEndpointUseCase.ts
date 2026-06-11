import type { IWebhookEndpointRepository } from "../repositories/IWebhookEndpointRepository";
import type { UUID } from "@/shared/types/database.types";
import type { WebhookEndpoint, CreateWebhookEndpointInput } from "../entities/Webhook";
import { validateWebhookUrl } from "./lib/validateWebhookUrl";

export class CreateWebhookEndpointUseCase {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async execute(userId: UUID, input: CreateWebhookEndpointInput): Promise<WebhookEndpoint> {
    validateWebhookUrl(input.url);
    return this.repo.create(userId, input);
  }
}
