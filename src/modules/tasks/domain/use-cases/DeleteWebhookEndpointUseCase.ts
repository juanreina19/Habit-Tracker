import type { IWebhookEndpointRepository } from "../repositories/IWebhookEndpointRepository";
import type { UUID } from "@/shared/types/database.types";

export class DeleteWebhookEndpointUseCase {
  constructor(private readonly repo: IWebhookEndpointRepository) {}

  async execute(id: UUID): Promise<void> {
    return this.repo.delete(id);
  }
}
