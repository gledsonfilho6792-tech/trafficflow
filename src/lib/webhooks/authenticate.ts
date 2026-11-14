import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookPayload } from "./types";
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function authenticateWebhook(
  provider: string,
  payload: WebhookPayload,
  headers: Headers,
  rawBody: string,
  expectedHash: string,
  signingSecret?: string | null,
) {
  if (provider === "cakto" && headers.has("x-cakto-signature")) {
    if (!signingSecret) return false;
    const stamp = headers.get("x-cakto-timestamp") || "";
    if (
      !/^\d+$/.test(stamp) ||
      Math.abs(Date.now() / 1000 - Number(stamp)) > 300
    )
      return false;
    const expected =
      "v1=" +
      createHmac("sha256", signingSecret)
        .update(stamp + "." + rawBody)
        .digest("hex");
    return equal(headers.get("x-cakto-signature") || "", expected);
  }
  const token =
    provider === "hotmart"
      ? headers.get("x-hotmart-hottok")
      : provider === "cakto"
        ? payload.secret
        : provider === "applyfy"
          ? payload.token
          : null;
  return (
    typeof token === "string" &&
    !!expectedHash &&
    equal(createHash("sha256").update(token).digest("hex"), expectedHash)
  );
}
