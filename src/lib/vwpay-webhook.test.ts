import { describe, it, expect } from "vitest";
import { processVWPayWebhook, type WebhookDeps } from "./vwpay-webhook.server";

const ORDER = "11111111-1111-4111-8111-111111111111";
function fake(orders: { id: string; transaction_id: string | null }[], valid = true) {
  const events: any[] = []; const applied: [string, string][] = [];
  const d: WebhookDeps = {
    verify: async () => valid,
    insertEvent: async (row) => {
      if (events.some((e) => e.event_id === row["event_id"])) return { duplicate: true };
      const e = { id: String(events.length + 1), ...row }; events.push(e); return { id: e.id };
    },
    updateEvent: async (id, p) => { Object.assign(events.find((e) => e.id === id), p); },
    deleteEvent: async () => {},
    findOrderByTransactionId: async (tx) => orders.find((o) => o.transaction_id === tx) ?? null,
    findOrderById: async (id) => orders.find((o) => o.id === id) ?? null,
    confirmStatus: async () => ({ status: "APPROVED", externalId: ORDER }),
    applyStatus: async (o, s) => { applied.push([o, s]); },
  };
  return { d, events, applied };
}
const body = (id: string, externalId?: string) => JSON.stringify({ event: "TRANSACTION", transaction: { id, externalId, status: "APPROVED" } });

describe("VW Pay webhook order lookup", () => {
  it("1. finds order by transaction.id", async () => {
    const f = fake([{ id: ORDER, transaction_id: "tx1" }]);
    await processVWPayWebhook(body("tx1", ORDER), "s", f.d);
    expect(f.applied).toEqual([[ORDER, "APPROVED"]]);
    expect(f.events[0].payload.lookup).toBe("transaction_id");
  });
  it("2. falls back to externalId -> orders.id", async () => {
    const f = fake([{ id: ORDER, transaction_id: null }]);
    await processVWPayWebhook(body("tx2", ORDER), "s", f.d);
    expect(f.applied).toEqual([[ORDER, "APPROVED"]]);
    expect(f.events[0].payload.fallback).toBe(true);
  });
  it("3. no match: nothing applied, error logged", async () => {
    const f = fake([]);
    const r = await processVWPayWebhook(body("tx3", "22222222-2222-4222-8222-222222222222"), "s", f.d);
    expect(r.status).toBe(200);
    expect(f.applied).toEqual([]);
    expect(f.events[0].error).toMatch(/order not found/);
  });
  it("4. repeated event applies once", async () => {
    const f = fake([{ id: ORDER, transaction_id: "tx1" }]);
    await processVWPayWebhook(body("tx1"), "s", f.d);
    const r = await processVWPayWebhook(body("tx1"), "s", f.d);
    expect(await r.json()).toEqual({ ok: true, duplicate: true });
    expect(f.applied.length).toBe(1);
  });
  it("5. invalid signature rejected", async () => {
    const f = fake([{ id: ORDER, transaction_id: "tx1" }], false);
    const r = await processVWPayWebhook(body("tx1"), "bad", f.d);
    expect(r.status).toBe(401);
    expect(f.applied).toEqual([]);
    expect(f.events[0].signature_valid).toBe(false);
  });
  it("fallback refuses order bound to another transaction", async () => {
    const f = fake([{ id: ORDER, transaction_id: "other" }]);
    await processVWPayWebhook(body("tx9", ORDER), "s", f.d);
    expect(f.applied).toEqual([]);
  });
});
