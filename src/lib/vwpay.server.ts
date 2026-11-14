/**
 * VWPayService — the only place that talks to VW Pay (official API v1). Server-only.
 * Secrets: VWPAY_CLIENT_ID, VWPAY_CLIENT_SECRET, VWPAY_WEBHOOK_SECRET, optional VWPAY_BASE_URL.
 */
import type { PaymentStatus } from "./format";

export type Method = "pix" | "card" | "boleto";
const METHOD_MAP: Record<Method, "PIX" | "CREDIT_CARD" | "INVOICE"> = { pix: "PIX", card: "CREDIT_CARD", boleto: "INVOICE" };

export interface CardInput { number: string; holderName: string; expirationMonth: string; expirationYear: string; cvv: string; installments: number }

export interface CreateTransactionInput {
  orderId: string;
  amount: number;
  method: Method;
  description: string;
  payer: { name: string; email: string; phone?: string | null; documentType: "CPF" | "CNPJ"; documentNumber: string };
  card?: CardInput;
  ip?: string | null;
}

export interface TransactionResult {
  transactionId: string;
  externalId: string | null;
  status: PaymentStatus | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  boletoLine?: string | null;
  boletoUrl?: string | null;
  expiresAt?: string | null;
  refusedReason?: string | null;
}

export class VWPayNotConfiguredError extends Error {
  constructor() { super("Pagamento indisponível: a integração VW Pay ainda não foi configurada."); }
}
export class VWPayRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const DEFAULT_BASE = "https://app.vwpaypagamentos.com/api/v1";
function config() {
  const clientId = process.env["VWPAY_CLIENT_ID"];
  const clientSecret = process.env["VWPAY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new VWPayNotConfiguredError();
  return { clientId, clientSecret, baseUrl: (process.env["VWPAY_BASE_URL"] || DEFAULT_BASE).replace(/\/$/, "") };
}
export const isVWPayConfigured = () => !!(process.env["VWPAY_CLIENT_ID"] && process.env["VWPAY_CLIENT_SECRET"]);

/** Official statuses -> internal. Returns null for statuses that must not change access (IN_PROTEST, PRE_CHARGEBACK, PROCESSING). */
export function mapStatus(raw: unknown): PaymentStatus | null {
  switch (String(raw ?? "").toUpperCase()) {
    case "APPROVED": return "APPROVED";
    case "REFUSED": return "DECLINED";
    case "CANCELLED": case "CANCELED": return "CANCELED";
    case "REFUNDED": case "CHARGEBACK": return "REFUNDED";
    case "EXPIRED": return "EXPIRED";
    case "PENDING": return "PENDING";
    default: return null;
  }
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
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    console.error("[VWPay] request failed", path, res.status, typeof body === "object" ? body?.message : "");
    const msg = typeof body === "object" && body?.message ? String(body.message) : `VW Pay respondeu com erro (${res.status}).`;
    throw new VWPayRequestError(res.status, msg);
  }
  return body;
}

export const VWPayService = {
  async createTransaction(input: CreateTransactionInput): Promise<TransactionResult> {
    const method = METHOD_MAP[input.method];
    const payload: Record<string, unknown> = {
      method,
      amount: Math.round(input.amount * 100),
      payer: {
        name: input.payer.name,
        email: input.payer.email,
        ...(input.payer.phone ? { phone: input.payer.phone } : {}),
        document: { type: input.payer.documentType, number: input.payer.documentNumber },
      },
      items: [{ title: input.description, quantity: 1, unitPrice: Math.round(input.amount * 100), tangible: false }],
      metadata: { order_id: input.orderId },
      ...(input.ip ? { ip: input.ip } : {}),
    };
    if (method === "PIX") Object.assign(payload, { expiresIn: 3600, description: input.description });
    if (method === "INVOICE") Object.assign(payload, { expiresIn: 3, description: input.description });
    if (method === "CREDIT_CARD" && input.card) {
      const { installments, ...card } = input.card;
      Object.assign(payload, { card, installments });
    }
    const b = await request("/transactions", {
      method: "POST",
      headers: { "X-Idempotency-Key": input.orderId },
      body: JSON.stringify(payload),
    });
    return {
      transactionId: String(b.id),
      externalId: b.externalId ?? null,
      // PIX/boleto creation response has no status: they start PENDING. Card returns APPROVED/REFUSED.
      status: b.status ? mapStatus(b.status) : "PENDING",
      pixQrCode: b.qrcode?.base64 ?? null,
      pixCopyPaste: b.qrcode?.code ?? null,
      boletoLine: b.digitable ?? b.code ?? null,
      boletoUrl: b.url ?? null,
      expiresAt: b.expiresAt ?? null,
    };
  },

  /** Authoritative source of truth (snake_case response). */
  async getTransaction(transactionId: string): Promise<TransactionResult> {
    const b = await request(`/transactions/${encodeURIComponent(transactionId)}`);
    return {
      transactionId: String(b.id),
      externalId: b.external_id ?? null,
      status: mapStatus(b.status),
      refusedReason: b.refused_reason ?? null,
    };
  },

  /** x-webhook-signature = hex HMAC-SHA256(raw body, VWPAY_WEBHOOK_SECRET), constant-time compared. */
  async verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
    const secret = process.env["VWPAY_WEBHOOK_SECRET"];
    if (!secret || !signature) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const given = signature.trim().toLowerCase();
    if (given.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
    return diff === 0;
  },
};
