import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/vwpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { VWPayService, mapStatus } = await import("@/lib/vwpay.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // HMAC over the raw bytes, before any parse.
        const raw = await request.text();
        const valid = await VWPayService.verifyWebhookSignature(raw, request.headers.get("x-webhook-signature"));

        let payload: any;
        try { payload = JSON.parse(raw); } catch { return new Response("invalid body", { status: 400 }); }
        const t = payload?.transaction ?? {};
        const transactionId = typeof t.id === "string" ? t.id.slice(0, 100) : "";
        const eventType = String(payload?.event ?? "").slice(0, 50);

        if (!valid) {
          await supabaseAdmin.from("webhook_events").insert({
            event_id: `invalid:${crypto.randomUUID()}`, transaction_id: transactionId || null,
            event_type: eventType || "unknown", signature_valid: false, error: "invalid signature",
          });
          return new Response("invalid signature", { status: 401 });
        }
        // Withdraw events and malformed payloads are acknowledged and ignored.
        if (!transactionId || eventType.startsWith("WITHDRAW")) return Response.json({ ok: true, ignored: true });

        // Idempotency key: transaction id + status (per VW Pay docs).
        const { data: inserted, error } = await supabaseAdmin
          .from("webhook_events")
          .insert({
            event_id: `${transactionId}:${String(t.status ?? eventType)}`,
            transaction_id: transactionId, event_type: eventType,
            payload: { id: transactionId, status: t.status, method: t.method, externalId: t.externalId ?? null },
            signature_valid: true,
          })
          .select().maybeSingle();
        if (error?.code === "23505") return Response.json({ ok: true, duplicate: true });
        if (error || !inserted) return new Response("error", { status: 500 });

        const { data: order } = await supabaseAdmin.from("orders").select("id").eq("transaction_id", transactionId).maybeSingle();
        if (!order) {
          await supabaseAdmin.from("webhook_events").update({ error: "order not found" }).eq("id", inserted.id);
          return Response.json({ ok: true });
        }
        // Webhook is a notification only: confirm with GET /transactions/{id} before changing access.
        let status = null;
        try { status = (await VWPayService.getTransaction(transactionId)).status; }
        catch (e) {
          console.error("[webhook] confirm failed", e);
          await supabaseAdmin.from("webhook_events").delete().eq("id", inserted.id); // allow retry
          return new Response("retry", { status: 503 });
        }
        if (status && status !== "PENDING") await supabaseAdmin.rpc("apply_payment_status", { _order_id: order.id, _status: status });
        await supabaseAdmin.from("webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString(), error: status ? null : `status ignored: ${t.status}` })
          .eq("id", inserted.id);
        void mapStatus;
        return Response.json({ ok: true });
      },
    },
  },
});
