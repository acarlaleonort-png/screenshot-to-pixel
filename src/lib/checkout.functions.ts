import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cleanCNPJ, isValidCNPJ, isValidCPF, isValidExpiry, isValidLuhn, isValidPhone, onlyDigits } from "./masks";
import { isMethodEnabled } from "./payment-methods";

const checkoutSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().refine(isValidPhone, "Telefone inválido"),
  documentType: z.enum(["CPF", "CNPJ"]),
  document: z.string().trim().max(20),
  method: z.enum(["pix", "card", "boleto"]),
  adult: z.literal(true),
  terms: z.literal(true),
  privacy: z.literal(true),
  card: z
    .object({
      number: z.string().refine(isValidLuhn, "Cartão inválido"),
      holderName: z.string().trim().min(3).max(100),
      expiry: z.string().refine((v) => isValidExpiry(v), "Validade inválida"),
      cvv: z.string().regex(/^\d{3,4}$/),
      installments: z.number().int().min(1).max(12),
    })
    .optional(),
}).superRefine((d, ctx) => {
  const ok = d.documentType === "CPF" ? isValidCPF(d.document) : isValidCNPJ(d.document);
  if (!ok) ctx.addIssue({ code: "custom", path: ["document"], message: "Documento inválido" });
  if (d.method === "card" && !d.card) ctx.addIssue({ code: "custom", path: ["card"], message: "Dados do cartão obrigatórios" });
  if (d.method !== "card" && d.card) ctx.addIssue({ code: "custom", path: ["card"], message: "Cartão só é aceito no método cartão" });
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { VWPayService, VWPayNotConfiguredError, VWPayRequestError } = await import("./vwpay.server");
    const docNumber = data.documentType === "CPF" ? onlyDigits(data.document) : cleanCNPJ(data.document);
    const phone = onlyDigits(data.phone);
    const email = (context.claims as { email?: string }).email ?? "";

    // Price always comes from the database, never from the browser.
    const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", data.planId).eq("active", true).maybeSingle();
    if (!plan) return { ok: false as const, error: "Plano indisponível." };

    const { data: settings } = await supabaseAdmin.from("site_settings").select("methods_enabled").eq("id", 1).maybeSingle();
    if (!isMethodEnabled(settings?.methods_enabled, data.method)) return { ok: false as const, error: "Forma de pagamento indisponível." };

    const { data: customer, error: cErr } = await supabaseAdmin
      .from("customers")
      .upsert(
        { user_id: context.userId, name: data.name, email, phone, document: docNumber },
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
      const req = getRequest();
      const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const card = data.card
        ? {
            number: onlyDigits(data.card.number),
            holderName: data.card.holderName.toUpperCase(),
            expirationMonth: onlyDigits(data.card.expiry).slice(0, 2),
            expirationYear: `20${onlyDigits(data.card.expiry).slice(2, 4)}`,
            cvv: data.card.cvv,
            installments: data.card.installments,
          }
        : undefined;
      const tx = await VWPayService.createTransaction({
        orderId: order.id,
        amount: Number(plan.price),
        method: data.method,
        description: plan.name,
        payer: { name: data.name, email, phone, documentType: data.documentType, documentNumber: docNumber },
        card,
        ip,
      });
      await supabaseAdmin.from("orders").update({ transaction_id: tx.transactionId, external_id: tx.externalId }).eq("id", order.id);
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
        raw_reference_data: { id: tx.transactionId, externalId: tx.externalId } as never,
      });
      // Card returns a synchronous outcome; confirm it with the authoritative GET before applying.
      if (data.method === "card" && tx.status && tx.status !== "PENDING") {
        const confirmed = await VWPayService.getTransaction(tx.transactionId).catch(() => null);
        const st = confirmed?.status ?? (tx.status === "DECLINED" ? "DECLINED" : null);
        if (st && st !== "PENDING") await supabaseAdmin.rpc("apply_payment_status", { _order_id: order.id, _status: st });
      }
      return { ok: true as const, orderId: order.id };
    } catch (e) {
      await supabaseAdmin.from("orders").update({ status: "CANCELED" }).eq("id", order.id);
      const msg =
        e instanceof VWPayNotConfiguredError
          ? e.message
          : e instanceof VWPayRequestError && e.status === 400
            ? `Dados recusados pela operadora: ${e.message}`
            : "Não foi possível iniciar o pagamento. Tente novamente.";
      console.error("[checkout]", e instanceof Error ? e.name + ": " + e.message : "unknown error");
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
          if (tx.status && tx.status !== "PENDING") {
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
