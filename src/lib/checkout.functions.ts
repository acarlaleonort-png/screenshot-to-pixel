import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  method: z.enum(["pix", "card", "boleto"]),
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { VWPayService, VWPayNotConfiguredError } = await import("./vwpay.server");
    const email = (context.claims as { email?: string }).email ?? "";

    // Price always comes from the database, never from the browser.
    const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", data.planId).eq("active", true).maybeSingle();
    if (!plan) return { ok: false as const, error: "Plano indisponível." };

    const { data: settings } = await supabaseAdmin.from("site_settings").select("methods_enabled").eq("id", 1).single();
    const enabled = (settings?.methods_enabled ?? {}) as Record<string, boolean>;
    if (!enabled[data.method]) return { ok: false as const, error: "Forma de pagamento indisponível." };

    const { data: customer, error: cErr } = await supabaseAdmin
      .from("customers")
      .upsert(
        { user_id: context.userId, name: data.name, email, phone: data.phone || null, document: data.document || null },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (cErr || !customer) return { ok: false as const, error: "Não foi possível salvar seus dados." };

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({ customer_id: customer.id, plan_id: plan.id, amount: plan.price, method: data.method })
      .select()
      .single();
    if (oErr || !order) return { ok: false as const, error: "Não foi possível criar o pedido." };

    try {
      const origin = new URL(getRequest().url).origin;
      const tx = await VWPayService.createTransaction({
        orderId: order.id,
        amount: Number(plan.price),
        method: data.method,
        description: plan.name,
        customer: { name: data.name, email, document: data.document || null, phone: data.phone || null },
        callbackUrl: `${origin}/api/public/vwpay/webhook`,
      });
      await supabaseAdmin.from("orders").update({ transaction_id: tx.transactionId, external_id: order.id }).eq("id", order.id);
      await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        method: data.method,
        amount: plan.price,
        transaction_id: tx.transactionId,
        pix_qr_code: tx.pixQrCode ?? null,
        pix_copy_paste: tx.pixCopyPaste ?? null,
        boleto_line: tx.boletoLine ?? null,
        boleto_url: tx.boletoUrl ?? null,
        expires_at: tx.expiresAt ?? null,
        raw_reference_data: tx.raw as never,
      });
      // Only DECLINED is applied from the synchronous response; approval waits for backend confirmation.
      if (tx.status === "DECLINED") await supabaseAdmin.rpc("apply_payment_status", { _order_id: order.id, _status: "DECLINED" });
      return { ok: true as const, orderId: order.id };
    } catch (e) {
      await supabaseAdmin.from("orders").update({ status: "CANCELED" }).eq("id", order.id);
      const msg = e instanceof VWPayNotConfiguredError ? e.message : "Não foi possível iniciar o pagamento. Tente novamente.";
      console.error("[checkout]", e);
      return { ok: false as const, error: msg };
    }
  });

export const getOrderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS: user only sees their own order.
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, amount, status, method, transaction_id, plans(name, billing_period), payments(pix_qr_code, pix_copy_paste, boleto_line, boleto_url, expires_at)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return null;

    // Reconcile pending orders directly with the gateway (server-side confirmation).
    if (order.status === "PENDING" && order.transaction_id) {
      try {
        const { VWPayService, isVWPayConfigured } = await import("./vwpay.server");
        if (isVWPayConfigured()) {
          const tx = await VWPayService.getTransaction(order.transaction_id);
          if (tx.status !== "PENDING") {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.rpc("apply_payment_status", { _order_id: order.id, _status: tx.status });
            return { ...order, status: tx.status };
          }
        }
      } catch (e) {
        console.error("[order-status]", e);
      }
    }
    return order;
  });
