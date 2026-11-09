import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/vwpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { VWPayService, mapStatus } = await import("@/lib/vwpay.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const raw = await request.text();
        const signature =
          request.headers.get("x-vwpay-signature") ?? request.headers.get("x-signature") ?? request.headers.get("signature");
        const valid = await VWPayService.verifyWebhookSignature(raw, signature);

        let payload: Record<string, any>;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("invalid body", { status: 400 });
        }
        const d = (payload.data ?? payload) as Record<string, any>;
        const transactionId = String(d.id ?? d.transaction_id ?? d.transactionId ?? "");
        const eventType = String(payload.event ?? payload.type ?? "transaction.updated");
        const eventId = String(payload.event_id ?? payload.id ?? `${transactionId}:${d.status}`);

        if (!valid) {
          await supabaseAdmin.from("webhook_events").insert({
            event_id: `invalid:${crypto.randomUUID()}`,
            transaction_id: transactionId || null,
            event_type: eventType,
            signature_valid: false,
            error: "invalid signature",
          });
          return new Response("invalid signature", { status: 401 });
        }

        // Idempotency: unique (gateway, event_id).
        const { data: inserted, error } = await supabaseAdmin
          .from("webhook_events")
          .insert({
            event_id: eventId,
            transaction_id: transactionId,
            event_type: eventType,
            payload: { id: transactionId, status: d.status, event: eventType },
            signature_valid: true,
          })
          .select()
          .maybeSingle();
        if (error?.code === "23505") return Response.json({ ok: true, duplicate: true });
        if (error || !inserted) return new Response("error", { status: 500 });

        const { data: order } = await supabaseAdmin.from("orders").select("id").eq("transaction_id", transactionId).maybeSingle();
        if (!order) {
          await supabaseAdmin.from("webhook_events").update({ error: "order not found" }).eq("id", inserted.id);
          return Response.json({ ok: true });
        }
        await supabaseAdmin.rpc("apply_payment_status", { _order_id: order.id, _status: mapStatus(d.status) });
        await supabaseAdmin
          .from("webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("id", inserted.id);
        return Response.json({ ok: true });
      },
    },
  },
});
