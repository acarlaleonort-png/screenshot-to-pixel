/**
 * VWPayService — the only place that talks to VW Pay. Server-only.
 * Credentials come from secrets: VWPAY_CLIENT_ID, VWPAY_CLIENT_SECRET, VWPAY_BASE_URL, VWPAY_WEBHOOK_SECRET.
 * Endpoint paths and payload fields below must be confirmed against the official VW Pay documentation.
 */
import type { PaymentStatus } from "./format";

export type Method = "pix" | "card" | "boleto";

export interface CreateTransactionInput {
  orderId: string;
  amount: number;
  method: Method;
  description: string;
  customer: { name: string; email: string; document?: string | null; phone?: string | null };
  callbackUrl: string;
}

export interface TransactionResult {
  transactionId: string;
  status: PaymentStatus;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  boletoLine?: string | null;
  boletoUrl?: string | null;
  expiresAt?: string | null;
  raw: unknown;
}

export class VWPayNotConfiguredError extends Error {
  constructor() {
    super("Pagamento indisponível: a integração VW Pay ainda não foi configurada.");
  }
}

function config() {
  const clientId = process.env["VWPAY_CLIENT_ID"];
  const clientSecret = process.env["VWPAY_CLIENT_SECRET"];
  const baseUrl = process.env["VWPAY_BASE_URL"];
  if (!clientId || !clientSecret || !baseUrl) throw new VWPayNotConfiguredError();
  return { clientId, clientSecret, baseUrl: baseUrl.replace(/\/$/, "") };
}

export function isVWPayConfigured() {
  return !!(process.env["VWPAY_CLIENT_ID"] && process.env["VWPAY_CLIENT_SECRET"] && process.env["VWPAY_BASE_URL"]);
}

/** Maps gateway status strings to the internal standard. */
export function mapStatus(raw: unknown): PaymentStatus {
  const s = String(raw ?? "").toLowerCase();
  if (["paid", "approved", "confirmed", "completed", "succeeded", "captured"].includes(s)) return "APPROVED";
  if (["declined", "refused", "failed", "denied", "rejected"].includes(s)) return "DECLINED";
  if (["canceled", "cancelled", "voided"].includes(s)) return "CANCELED";
  if (["refunded", "chargeback", "chargedback"].includes(s)) return "REFUNDED";
  if (["expired"].includes(s)) return "EXPIRED";
  return "PENDING";
}

async function request(path: string, init: RequestInit = {}) {
  const { clientId, clientSecret, baseUrl } = config();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    console.error("[VWPay] request failed", path, res.status);
    throw new Error(`VW Pay respondeu com erro (${res.status}).`);
  }
  return body as Record<string, any>;
}

function normalize(body: Record<string, any>): TransactionResult {
  const d = (body?.data ?? body) as Record<string, any>;
  return {
    transactionId: String(d.id ?? d.transaction_id ?? d.transactionId),
    status: mapStatus(d.status),
    pixQrCode: d.pix?.qr_code_image ?? d.pix?.qrcode ?? d.qr_code_image ?? null,
    pixCopyPaste: d.pix?.qr_code ?? d.pix?.copy_paste ?? d.pix_code ?? null,
    boletoLine: d.boleto?.digitable_line ?? d.boleto?.line ?? null,
    boletoUrl: d.boleto?.url ?? d.boleto?.pdf ?? null,
    expiresAt: d.expires_at ?? d.pix?.expires_at ?? d.boleto?.due_date ?? null,
    raw: { id: d.id, status: d.status },
  };
}

export const VWPayService = {
  async createTransaction(input: CreateTransactionInput): Promise<TransactionResult> {
    const body = await request("/transactions", {
      method: "POST",
      body: JSON.stringify({
        external_id: input.orderId,
        amount: Math.round(input.amount * 100),
        payment_method: input.method,
        description: input.description,
        postback_url: input.callbackUrl,
        customer: input.customer,
      }),
    });
    return normalize(body);
  },

  async getTransaction(transactionId: string): Promise<TransactionResult> {
    return normalize(await request(`/transactions/${encodeURIComponent(transactionId)}`));
  },

  /** HMAC-SHA256 of the raw body with VWPAY_WEBHOOK_SECRET, hex encoded, constant-time compared. */
  async verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
    const secret = process.env["VWPAY_WEBHOOK_SECRET"];
    if (!secret || !signature) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const given = signature.replace(/^sha256=/, "").trim().toLowerCase();
    if (given.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
    return diff === 0;
  },
};
