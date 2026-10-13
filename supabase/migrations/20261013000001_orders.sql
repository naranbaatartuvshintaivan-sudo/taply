-- TAPLY: захиалга, төлбөр, webhook event, бүтээгдэхүүн
-- Бүх таблицад RLS асаалттай, policy байхгүй → anon/authenticated хандах боломжгүй.
-- Зөвхөн сервер (service role) хандана.

-- ─── Бүтээгдэхүүн ──────────────────────────────────────────────
create table public.products (
  sku   text primary key,
  name  text not null,
  stock integer -- null = хязгааргүй. Тоог эзэн нь өөрөө оруулна.
);

insert into public.products (sku, name) values
  ('fb_sticker',  'FB наалт'),
  ('ig_sticker',  'IG наалт'),
  ('fb_stand',    'FB стенд'),
  ('ig_stand',    'IG стенд'),
  ('custom_wide', 'Custom стенд');

-- ─── Захиалга ──────────────────────────────────────────────────
create sequence public.order_code_seq start 1001;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique default ('TP-' || nextval('public.order_code_seq')),
  type              text not null check (type in ('standard', 'custom')),
  status            text not null default 'pending_payment'
                    check (status in ('pending_payment', 'paid', 'expired', 'canceled', 'in_production', 'delivered')),
  customer_name     text not null,
  phone             text not null,
  email             text,
  district          text not null,
  address           text not null,
  note              text,
  items             jsonb not null,           -- [{ "sku": "fb_sticker", "qty": 2 }]
  total_qty         integer not null check (total_qty > 0),
  subtotal          integer not null check (subtotal >= 0),
  delivery_fee      integer not null check (delivery_fee >= 0),
  total             integer not null check (total > 0 and total = subtotal + delivery_fee),
  fb_url            text,
  ig_url            text,
  custom_request_id uuid,
  paid_at           timestamptz,
  paid_payment_intent_id text,                -- аль intent-ээр төлөгдсөн (давхар төлбөр илрүүлэх)
  notified_at       timestamptz,              -- Telegram илгээгдсэн
  notify_claimed_at timestamptz,              -- Telegram илгээх эрхийг авсан (давхар илгээхээс сэргийлнэ)
  customer_emailed_at timestamptz,
  email_claimed_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_status_created_idx on public.orders (status, created_at);

-- ─── Төлбөрийн оролдлого (PaymentIntent бүрд нэг мөр) ──────────
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  payment_intent_id text not null unique,
  attempt           integer not null check (attempt > 0),
  status            text not null,            -- Wire-ийн PaymentIntent status
  amount            integer not null,
  livemode          boolean not null,
  created_at        timestamptz not null default now(),
  unique (order_id, attempt)
);

create index payments_order_idx on public.payments (order_id);

-- ─── Webhook event — давхардлыг шүүх ───────────────────────────
create table public.webhook_events (
  event_id    text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

-- ─── updated_at автоматаар ─────────────────────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ─── markPaid: нэг transaction дотор ──────────────────────────
-- pending_payment/expired → paid болгож, нөөцийг хасна.
-- Мөр буцвал энэ дуудлага л "ялсан" — мэдэгдлийг зөвхөн тэр илгээнэ.
-- low_stock: хасалтын дараа сөрөг болсон SKU-ууд (захиалгыг цуцлахгүй, ⚠️ илгээнэ).
create function public.mark_order_paid(p_order_id uuid, p_payment_intent_id text)
returns table (order_row public.orders, short_skus text[])
language plpgsql set search_path = '' as $$
declare
  o public.orders;
  shorts text[] := '{}';
  it jsonb;
  remaining integer;
begin
  update public.orders
     set status = 'paid', paid_at = now(), paid_payment_intent_id = p_payment_intent_id
   where id = p_order_id and status in ('pending_payment', 'expired')
  returning * into o;

  if not found then
    return; -- аль хэдийн төлөгдсөн (эсвэл цуцлагдсан) — юу ч буцаахгүй
  end if;

  update public.payments set status = 'succeeded' where payment_intent_id = p_payment_intent_id;

  for it in select * from jsonb_array_elements(o.items) loop
    update public.products
       set stock = stock - (it->>'qty')::integer
     where sku = it->>'sku' and stock is not null
    returning stock into remaining;
    if remaining is not null and remaining < 0 then
      shorts := shorts || (it->>'sku');
    end if;
  end loop;

  order_row := o;
  short_skus := shorts;
  return next;
end $$;

-- ─── Мэдэгдэл илгээх эрх авах (lease) ─────────────────────────
-- Илгээгээгүй, эсвэл 10 минутаас өмнө эрх авсан ч дуусгаагүй бол эрхийг өгнө.
create function public.claim_order_notification(p_order_id uuid, p_kind text)
returns boolean
language plpgsql set search_path = '' as $$
declare ok boolean;
begin
  if p_kind = 'telegram' then
    update public.orders set notify_claimed_at = now()
     where id = p_order_id and status <> 'pending_payment' and notified_at is null
       and (notify_claimed_at is null or notify_claimed_at < now() - interval '10 minutes')
    returning true into ok;
  elsif p_kind = 'email' then
    update public.orders set email_claimed_at = now()
     where id = p_order_id and status <> 'pending_payment' and customer_emailed_at is null
       and email is not null
       and (email_claimed_at is null or email_claimed_at < now() - interval '10 minutes')
    returning true into ok;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
  return coalesce(ok, false);
end $$;

-- ─── Хандалт: зөвхөн service role ─────────────────────────────
alter table public.products       enable row level security;
alter table public.orders         enable row level security;
alter table public.payments       enable row level security;
alter table public.webhook_events enable row level security;

revoke all on function public.mark_order_paid(uuid, text)          from public, anon, authenticated;
revoke all on function public.claim_order_notification(uuid, text) from public, anon, authenticated;
revoke all on function public.touch_updated_at()                   from public, anon, authenticated;
revoke all on sequence public.order_code_seq                       from anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text)          to service_role;
grant execute on function public.claim_order_notification(uuid, text) to service_role;
