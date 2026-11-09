import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const getLandingData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [settings, benefits, faqs, plans, previews] = await Promise.all([
    sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("benefits").select("*").eq("active", true).order("sort_order"),
    sb.from("faqs").select("*").eq("active", true).order("sort_order"),
    sb.from("plans").select("*").eq("active", true).order("sort_order"),
    sb.from("content_previews").select("*").eq("active", true).order("sort_order"),
  ]);
  return {
    settings: settings.data,
    benefits: benefits.data ?? [],
    faqs: faqs.data ?? [],
    plans: plans.data ?? [],
    previews: previews.data ?? [],
  };
});
