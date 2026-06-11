import crypto from "crypto";
import type { WebhookEvent, WebhookEnvelope } from "../../entities/Webhook";

const API_VERSION = "2026-06-10" as const;

export interface SignedWebhookRequest {
  body: string;
  headers: {
    "Content-Type": "application/json";
    "X-Webhook-Id": string;
    "X-Webhook-Timestamp": string;
    "X-Webhook-Signature": string;
    "X-Webhook-Event": string;
  };
}

/** Construye el sobre (envelope) delgado enviado al receptor a partir de una fila del outbox. */
export function buildWebhookEnvelope(event: WebhookEvent): WebhookEnvelope {
  return {
    id: event.id,
    apiVersion: API_VERSION,
    event: event.eventType,
    createdAt: event.createdAt,
    data: event.payload,
  };
}

/**
 * Firma el envelope con HMAC-SHA256 sobre `${timestamp}.${body}` (no solo `body`),
 * para que un (body, signature) capturado no pueda reenviarse indefinidamente
 * como válido. El receptor recalcula el HMAC con el mismo secret y compara.
 */
export function signWebhookPayload(envelope: WebhookEnvelope, secret: string): SignedWebhookRequest {
  const body = JSON.stringify(envelope);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${body}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  return {
    body,
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Id": envelope.id,
      "X-Webhook-Timestamp": timestamp,
      "X-Webhook-Signature": `sha256=${signature}`,
      "X-Webhook-Event": envelope.event,
    },
  };
}
