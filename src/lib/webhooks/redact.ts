import type { WebhookPayload } from "./types";
const secretKeys = new Set([
  "token",
  "secret",
  "hottok",
  "authorization",
  "client_secret",
  "access_token",
  "basic",
]);
export function redactWebhookSecrets(payload: WebhookPayload): WebhookPayload {
  function redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !secretKeys.has(key.toLowerCase()))
          .map(([key, v]) => [key, redact(v)]),
      );
    return value;
  }
  return redact(payload) as WebhookPayload;
}
