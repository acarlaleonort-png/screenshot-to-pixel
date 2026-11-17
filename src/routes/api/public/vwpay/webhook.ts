import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/vwpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { VWPayService } = await import("@/lib/vwpay.server");
        const { processVWPayWebhook } = await import("@/lib/vwpay-webhook.server");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const raw = await request.text(); // HMAC over raw bytes, before parse
        return processVWPayWebhook(raw, request.headers.get("x-webhook-signature"), {
          verify: (r, s) => VWPayService.verifyWebhookSignature(r, s),
          async insertEvent(row) {
            const { data, error } = await db.from("webhook_events").insert(row as any).select("id").maybeSingle();
            if (error?.code === "23505") return { duplicate: true };
            return error || !data ? { error: true } : { id: data.id };
          },
          async updateEvent(id, patch) { await db.from("webhook_events").update(patch as any).eq("id", id); },
          async deleteEvent(id) { await db.from("webhook_events").delete().eq("id", id); },
          async findOrderByTransactionId(tx) {
            const { data } = await db.from("orders").select("id, transaction_id").eq("transaction_id", tx).maybeSingle();
            return data;
          },
          async findOrderById(id) {
            const { data } = await db.from("orders").select("id, transaction_id").eq("id", id).maybeSingle();
            return data;
          },
          async confirmStatus(tx) { const r = await VWPayService.getTransaction(tx); return { status: r.status, externalId: r.externalId }; },
          async applyStatus(orderId, status) { await db.rpc("apply_payment_status", { _order_id: orderId, _status: status as any }); },
        });
      },
    },
  },
});
