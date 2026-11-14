import { supabase } from "@/integrations/supabase/client";
import { readChoice } from "./consent";

export type FunnelEvent =
  | "page_view"
  | "click_cta"
  | "plan_selected"
  | "checkout_started"
  | "payment_pending"
  | "payment_approved"
  | "payment_declined";

function sessionId() {
  if (typeof window === "undefined") return null;
  let id = sessionStorage.getItem("sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("sid", id);
  }
  return id;
}

export function track(event: FunnelEvent, data: { plan_id?: string; metadata?: Record<string, unknown> } = {}) {
  if (typeof window === "undefined") return;
  // LGPD: funnel measurement only with consent.
  if (readChoice("analytics") !== "granted") return;
  void supabase
    .from("analytics_events")
    .insert({ event, session_id: sessionId(), plan_id: data.plan_id ?? null, metadata: (data.metadata ?? null) as never })
    .then(() => undefined);
}
