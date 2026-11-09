
create type public.app_role as enum ('admin', 'user');
create type public.payment_status as enum ('PENDING','APPROVED','DECLINED','CANCELED','REFUNDED','EXPIRED');
create type public.payment_method as enum ('pix','card','boleto');
create type public.billing_period as enum ('monthly','quarterly','semiannual','annual','custom');

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profile own read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profile own update" on public.profiles for update to authenticated using (id = auth.uid());
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- signup handler: profile + first user becomes admin
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- site settings (single row)
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  display_name text not null default 'Seu nome',
  handle text not null default 'seuperfil',
  bio text not null default 'Edite esta descrição no painel administrativo.',
  headline text not null default 'Conteúdo exclusivo, direto para você.',
  subheadline text not null default 'Escolha seu plano e libere o acesso à área privada.',
  cta_label text not null default 'Escolher meu acesso',
  avatar_url text,
  cover_url text,
  accent_color text,
  social_links jsonb not null default '[]'::jsonb,
  payment_info text not null default 'Pagamento processado com segurança. Seus dados não ficam armazenados aqui.',
  social_proof text,
  methods_enabled jsonb not null default '{"pix":true,"card":true,"boleto":false}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.site_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();
insert into public.site_settings (id) values (1);

-- benefits & faq
create table public.benefits (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'Sparkles',
  title text not null,
  description text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.benefits, public.faqs to anon, authenticated;
grant insert, update, delete on public.benefits, public.faqs to authenticated;
grant all on public.benefits, public.faqs to service_role;
alter table public.benefits enable row level security;
alter table public.faqs enable row level security;
create policy "benefits read" on public.benefits for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "benefits admin" on public.benefits for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "faqs read" on public.faqs for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "faqs admin" on public.faqs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.benefits (icon,title,description,sort_order) values
 ('Lock','Área privada','Acesso individual com login próprio.',1),
 ('RefreshCw','Conteúdo atualizado','Novos conteúdos adicionados com frequência.',2),
 ('Smartphone','Acesso pelo celular','Funciona em qualquer dispositivo.',3);
insert into public.faqs (question,answer,sort_order) values
 ('Como funciona o acesso?','Edite esta resposta no painel administrativo.',1),
 ('Quais formas de pagamento?','Edite esta resposta no painel administrativo.',2),
 ('Quando o acesso é liberado?','Edite esta resposta no painel administrativo.',3);

-- plans
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  billing_period billing_period not null default 'monthly',
  duration_days int not null default 30 check (duration_days > 0),
  benefits jsonb not null default '[]'::jsonb,
  highlighted boolean not null default false,
  highlight_label text,
  cta_label text not null default 'Assinar agora',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "plans read" on public.plans for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "plans admin" on public.plans for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();

-- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  name text not null,
  email text not null,
  phone text,
  document text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.customers (email);
grant select on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers read" on public.customers for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  plan_id uuid not null references public.plans(id),
  amount numeric(10,2) not null,
  status payment_status not null default 'PENDING',
  method payment_method not null,
  gateway text not null default 'vwpay',
  external_id text,
  transaction_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (customer_id);
create index on public.orders (status);
create index on public.orders (created_at desc);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders read" on public.orders for select to authenticated using (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()));
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  gateway text not null default 'vwpay',
  method payment_method not null,
  amount numeric(10,2) not null,
  status payment_status not null default 'PENDING',
  transaction_id text,
  pix_qr_code text,
  pix_copy_paste text,
  boleto_line text,
  boleto_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  raw_reference_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payments (order_id);
create index on public.payments (transaction_id);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments read" on public.payments for select to authenticated using (
  public.has_role(auth.uid(),'admin') or exists (select 1 from public.orders o join public.customers c on c.id = o.customer_id where o.id = order_id and c.user_id = auth.uid()));
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- subscriptions / access
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null references public.plans(id),
  order_id uuid unique references public.orders(id),
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.subscriptions (user_id, expires_at);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "subs read" on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.has_active_access(_user_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.subscriptions where user_id = _user_id and status = 'active' and expires_at > now())
$$;

-- content
create table public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  media_type text not null default 'image',
  media_url text,
  thumbnail_url text,
  is_preview boolean not null default false,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.content to authenticated;
grant all on public.content to service_role;
alter table public.content enable row level security;
create policy "content members read" on public.content for select to authenticated using (
  public.has_role(auth.uid(),'admin') or (published and public.has_active_access(auth.uid())));
create policy "content admin" on public.content for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger content_touch before update on public.content for each row execute function public.touch_updated_at();

-- public previews: only thumbnail/title, no protected media
create table public.content_previews (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  thumbnail_url text,
  locked boolean not null default true,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.content_previews to anon, authenticated;
grant insert, update, delete on public.content_previews to authenticated;
grant all on public.content_previews to service_role;
alter table public.content_previews enable row level security;
create policy "previews read" on public.content_previews for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "previews admin" on public.content_previews for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- webhook events
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null default 'vwpay',
  event_id text not null,
  transaction_id text,
  event_type text,
  payload jsonb,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (gateway, event_id)
);
create index on public.webhook_events (transaction_id);
grant select on public.webhook_events to authenticated;
grant all on public.webhook_events to service_role;
alter table public.webhook_events enable row level security;
create policy "webhooks admin read" on public.webhook_events for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- analytics
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in ('page_view','click_cta','plan_selected','checkout_started','payment_pending','payment_approved','payment_declined')),
  session_id text,
  plan_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index on public.analytics_events (event, created_at);
grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
grant all on public.analytics_events to service_role;
alter table public.analytics_events enable row level security;
create policy "analytics insert" on public.analytics_events for insert to anon, authenticated with check (true);
create policy "analytics admin read" on public.analytics_events for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- grant access atomically & idempotently when payment approved
create or replace function public.apply_payment_status(_order_id uuid, _status payment_status) returns void
language plpgsql security definer set search_path = public as $$
declare o record; p record; uid uuid; base timestamptz;
begin
  select * into o from public.orders where id = _order_id for update;
  if not found then return; end if;
  if o.status = 'APPROVED' and _status = 'APPROVED' then return; end if;
  update public.orders set status = _status where id = _order_id;
  update public.payments set status = _status, paid_at = case when _status='APPROVED' then coalesce(paid_at, now()) else paid_at end where order_id = _order_id;
  if _status = 'APPROVED' then
    select user_id into uid from public.customers where id = o.customer_id;
    select * into p from public.plans where id = o.plan_id;
    if uid is not null then
      select greatest(now(), coalesce(max(expires_at), now())) into base from public.subscriptions where user_id = uid and status='active';
      insert into public.subscriptions (user_id, plan_id, order_id, expires_at)
      values (uid, o.plan_id, o.id, base + make_interval(days => p.duration_days))
      on conflict (order_id) do nothing;
    end if;
  elsif _status in ('REFUNDED','CANCELED') then
    update public.subscriptions set status = 'revoked' where order_id = _order_id;
  end if;
end $$;
revoke execute on function public.apply_payment_status(uuid, payment_status) from public, anon, authenticated;
grant execute on function public.apply_payment_status(uuid, payment_status) to service_role;
