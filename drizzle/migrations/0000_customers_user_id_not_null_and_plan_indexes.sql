ALTER TABLE public.customers ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS orders_plan_id_idx ON public.orders(plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON public.subscriptions(plan_id);