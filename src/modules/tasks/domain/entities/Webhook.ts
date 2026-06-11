import type { UUID, ISOTimestamp, TaskWebhookEventType } from "@/shared/types/database.types";

export type { TaskWebhookEventType };

export const ALL_TASK_WEBHOOK_EVENT_TYPES: TaskWebhookEventType[] = [
  "task.created",
  "task.updated",
  "task.completed",
  "task.uncompleted",
  "task.deleted",
];

export interface WebhookEndpoint {
  id: UUID;
  userId: UUID;
  url: string;
  description: string | null;
  secret: string;             // visible al dueño vía RLS — usado para firmar/verificar HMAC
  eventTypes: TaskWebhookEventType[];
  isActive: boolean;
  createdAt: ISOTimestamp;
  lastTriggeredAt: ISOTimestamp | null;
  lastStatus: "success" | "failed" | null;
  consecutiveFailures: number;
}

export interface CreateWebhookEndpointInput {
  url: string;
  description?: string;
  eventTypes?: TaskWebhookEventType[];   // default: todos
}

export interface UpdateWebhookEndpointInput {
  url?: string;
  description?: string | null;
  eventTypes?: TaskWebhookEventType[];
  isActive?: boolean;
}

/** Fila del outbox — solo lectura desde la app (la escriben los triggers de Postgres). */
export interface WebhookEvent {
  id: UUID;
  userId: UUID;
  eventType: TaskWebhookEventType;
  taskId: UUID;
  payload: Record<string, unknown>;
  createdAt: ISOTimestamp;
  dispatchStatus: "pending" | "delivered" | "failed";
}

export interface WebhookDelivery {
  id: UUID;
  eventId: UUID;
  endpointId: UUID;
  userId: UUID;
  status: "pending" | "success" | "failed";
  attemptCount: number;
  lastAttemptAt: ISOTimestamp | null;
  nextAttemptAt: ISOTimestamp;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: ISOTimestamp;
}

/** Resultado de un intento de entrega, usado para registrar el intento en el repositorio. */
export interface WebhookDeliveryAttemptResult {
  status: "success" | "failed" | "pending";
  responseStatus: number | null;
  responseBody: string | null;
  /** ISOTimestamp del próximo intento, o null si el resultado es terminal. */
  nextAttemptAt: string | null;
}

/** Sobre firmado enviado por la red. */
export interface WebhookEnvelope {
  id: UUID;                    // == webhookEvent.id, clave de idempotencia (header X-Webhook-Id)
  apiVersion: "2026-06-10";
  event: TaskWebhookEventType;
  createdAt: ISOTimestamp;
  data: Record<string, unknown>;
}
