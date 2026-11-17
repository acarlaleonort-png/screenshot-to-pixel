/**
 * VW Pay webhook processing (server-only). Pure logic with injected deps so it can be tested
 * without real payments. Order lookup: transaction.id -> orders.transaction_id, then fallback
 * transaction.externalId -> orders.id (only after HMAC passed).
 */
export interface WebhookDeps {
  verify(raw: string, sig: string | null): Promise<boolean>;
  insertEvent(row: Record<string, unknown>): Promise<{ id?: string; duplicate?: boolean; error?: boolean }>;
  updateEvent(id: string, patch: Record<string, unknown>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  findOrderByTransactionId(txId: string): Promise<{ id: string; transaction_id: string | null } | null>;
  findOrderById(id: string): Promise<{ id: string; transaction_id: string | null } | null>;
  confirmStatus(txId: string): Promise<{ status: string | null; externalId: string | null }>;
  applyStatus(orderId: string, status: string): Promise<void>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (b: unknown, status = 200) => Response.json(b, { status });

export async function processVWPayWebhook(raw: string, signature: string | null, d: WebhookDeps): Promise<Response> {
  const valid = await d.verify(raw, signature);
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("invalid body", { status: 400 }); }
  const t = payload?.transaction ?? {};
  const transactionId = typeof t.id === "string" ? t.id.slice(0, 100) : "";
  const externalId = typeof t.externalId === "string" ? t.externalId.slice(0, 100) : null;
  const eventType = String(payload?.event ?? "").slice(0, 50);

  if (!valid) {
    await d.insertEvent({
      event_id: `invalid:${crypto.randomUUID()}`, transaction_id: transactionId || null,
      event_type: eventType || "unknown", signature_valid: false, error: "invalid signature",
    });
    return new Response("invalid signature", { status: 401 });
  }
  if (!transactionId || eventType.startsWith("WITHDRAW")) return json({ ok: true, ignored: true });

  // Idempotency: unique (gateway, event_id) — a repeated webhook stops here.
  const diag: Record<string, unknown> = { id: transactionId, externalId, status: t.status ?? null, method: t.method ?? null };
  const ins = await d.insertEvent({
    event_id: `${transactionId}:${String(t.status ?? eventType)}`,
    transaction_id: transactionId, event_type: eventType, payload: diag, signature_valid: true,
  });
  if (ins.duplicate) return json({ ok: true, duplicate: true });
  if (ins.error || !ins.id) return new Response("error", { status: 500 });
  const eventId = ins.id;

  // 1) transaction.id -> orders.transaction_id ; 2) fallback externalId -> orders.id
  let order = await d.findOrderByTransactionId(transactionId);
  let strategy: string | null = order ? "transaction_id" : null;
  if (!order && externalId && UUID.test(externalId)) {
    const byId = await d.findOrderById(externalId);
    if (byId && byId.transaction_id && byId.transaction_id !== transactionId) {
      await d.updateEvent(eventId, { payload: { ...diag, lookup: "external_id", fallback: true }, error: "order found by externalId but bound to another transaction" });
      return json({ ok: true });
    }
    if (byId) { order = byId; strategy = "external_id"; }
  }
  if (!order) {
    const reason = externalId ? `order not found (transaction.id=${transactionId}, externalId=${externalId})` : `order not found (transaction.id=${transactionId}, no externalId)`;
    await d.updateEvent(eventId, { payload: { ...diag, lookup: null, fallback: !!externalId }, error: reason });
    return json({ ok: true });
  }
  const diag2 = { ...diag, lookup: strategy, fallback: strategy === "external_id", order_id: order.id };

  // Webhook is a notification only: confirm with GET /transactions/{id}.
  let confirmed: { status: string | null; externalId: string | null };
  try { confirmed = await d.confirmStatus(transactionId); }
  catch (e) {
    console.error("[webhook] confirm failed", e);
    await d.deleteEvent(eventId); // allow retry
    return new Response("retry", { status: 503 });
  }
  if (strategy === "external_id" && confirmed.externalId && confirmed.externalId !== order.id) {
    await d.updateEvent(eventId, { payload: diag2, error: "externalId mismatch on gateway confirmation" });
    return json({ ok: true });
  }
  if (confirmed.status && confirmed.status !== "PENDING") await d.applyStatus(order.id, confirmed.status);
  await d.updateEvent(eventId, {
    payload: diag2, processed: true, processed_at: new Date().toISOString(),
    error: confirmed.status ? null : `status ignored: ${t.status}`,
  });
  return json({ ok: true });
}
