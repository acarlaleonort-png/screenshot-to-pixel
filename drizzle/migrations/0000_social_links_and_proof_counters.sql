CREATE TABLE public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  url text NOT NULL CHECK (url ~* '^(https?://|mailto:|tel:)'),
  icon text NOT NULL DEFAULT 'link',
  active boolean NOT NULL DEFAULT true,
  highlighted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_links TO authenticated;
GRANT ALL ON public.social_links TO service_role;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_links read" ON public.social_links FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "social_links admin" ON public.social_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER social_links_touch BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.social_proof_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_key text NOT NULL UNIQUE,
  label text NOT NULL,
  display_base integer NOT NULL DEFAULT 0 CHECK (display_base >= 0),
  active boolean NOT NULL DEFAULT true,
  show_plus boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_proof_counters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_proof_counters TO authenticated;
GRANT ALL ON public.social_proof_counters TO service_role;
ALTER TABLE public.social_proof_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counters read" ON public.social_proof_counters FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "counters admin" ON public.social_proof_counters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER counters_touch BEFORE UPDATE ON public.social_proof_counters FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Real, idempotent events (likes/views later). Written only by the server (service_role).
CREATE TABLE public.social_proof_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_key text NOT NULL,
  dedupe_key text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counter_key, dedupe_key)
);
GRANT SELECT ON public.social_proof_events TO authenticated;
GRANT ALL ON public.social_proof_events TO service_role;
ALTER TABLE public.social_proof_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events admin read" ON public.social_proof_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Real counts only: subscribers = distinct users with a subscription tied to an APPROVED order.
CREATE OR REPLACE FUNCTION public.social_proof_real_counts()
RETURNS TABLE(counter_key text, real_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'subscribers'::text, count(DISTINCT s.user_id)
    FROM subscriptions s JOIN orders o ON o.id = s.order_id
   WHERE o.status = 'APPROVED'
  UNION ALL
  SELECT e.counter_key, count(*) FROM social_proof_events e
   WHERE e.counter_key <> 'subscribers' GROUP BY e.counter_key
$$;
REVOKE ALL ON FUNCTION public.social_proof_real_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_proof_real_counts() TO anon, authenticated, service_role;