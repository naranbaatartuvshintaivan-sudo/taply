-- TAPLY Phase 3 · Шат 1: өөрийн логотой (custom) хүсэлт
-- Бизнес, хүсэлт, rate limit, лого хадгалах private bucket.
-- Бүх таблицад RLS асаалттай, policy байхгүй → зөвхөн сервер (service role) хандана.

-- public.touch_updated_at() нь 20261013000001_orders.sql-д үүссэн (security invoker, search_path = '').

-- ─── Бизнес ────────────────────────────────────────────────────
-- Утсаар давтагдашгүй холбоо барих лавлах. Ижил утсаар дахин хүсэлт ирвэл шинэчилнэ (upsert).
-- Mockup, имэйл, хэвлэх файл нь ҮРГЭЛЖ custom_requests-ийн snapshot-ыг ашиглана, үүнийг биш.
create table public.businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 80),
  contact_name  text not null check (char_length(contact_name) between 1 and 80),
  phone         text not null unique check (phone ~ '^[0-9]{8}$'),
  email         text not null check (char_length(email) <= 254),
  district      text not null,
  address       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger businesses_touch before update on public.businesses
  for each row execute function public.touch_updated_at();

-- ─── Custom хүсэлт ─────────────────────────────────────────────
-- token: /c/<token> холбоосонд (32 тэмдэгт, таамаглах боломжгүй).
-- status:
--   generating         — загвар үүсгэж байна
--   awaiting_approval  — загвар бэлэн, админ имэйл илгээхийг хүлээж байна
--   sent               — харилцагч руу имэйл явсан
--   chosen             — харилцагч загвар сонгож төлсөн
--   failed             — загвар үүсгэх/QR шалгалт амжилтгүй
--   manual             — "Лого байхгүй": автомат загваргүй, гараар хийнэ
create table public.custom_requests (
  id             uuid primary key default gen_random_uuid(),
  token          text not null unique check (token ~ '^[A-Za-z0-9_-]{32}$'),
  business_id    uuid not null references public.businesses (id),
  -- Хүсэлт ирэх үеийн snapshot: дараа нь businesses шинэчлэгдсэн ч энэ хүсэлтийн загвар өөрчлөгдөхгүй
  business_name  text not null check (char_length(business_name) between 1 and 80),
  contact_name   text not null check (char_length(contact_name) between 1 and 80),
  email          text not null check (char_length(email) <= 254),
  quantity       integer not null check (quantity between 1 and 200),
  status         text not null default 'generating'
                 check (status in ('generating', 'awaiting_approval', 'sent', 'chosen', 'failed', 'manual')),
  chosen_design  text check (chosen_design in ('A', 'B', 'C')),
  fb_url         text,
  ig_url         text,
  logo_path      text, -- logos bucket доторх зам; "лого байхгүй" бол null
  note           text check (char_length(note) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (fb_url is not null or ig_url is not null)
);

create index custom_requests_business_idx on public.custom_requests (business_id);

create trigger custom_requests_touch before update on public.custom_requests
  for each row execute function public.touch_updated_at();

-- orders.custom_request_id (Phase 2-д аль хэдийн бий) → custom_requests
alter table public.orders
  add constraint orders_custom_request_id_fkey
  foreign key (custom_request_id) references public.custom_requests (id);

-- ─── Rate limit ────────────────────────────────────────────────
-- Түлхүүр нь hash (IP эсвэл имэйл нь шууд хадгалагдахгүй).
create table public.rate_limits (
  id          bigint generated always as identity primary key,
  bucket      text not null,      -- жишээ нь 'custom_ip', 'custom_email'
  key_hash    text not null,      -- sha256(salt + утга), hex
  created_at  timestamptz not null default now()
);

create index rate_limits_lookup_idx on public.rate_limits (bucket, key_hash, created_at);

-- Цонхон дахь тоог шалгаад, хязгаарт хүрээгүй бол бичнэ. Зэрэг хүсэлтэд
-- advisory lock-оор нэг түлхүүрийг дараалуулна. true = зөвшөөрнө.
create function public.hit_rate_limit(p_bucket text, p_key_hash text, p_limit integer, p_window interval)
returns boolean
language plpgsql set search_path = '' as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key_hash, 0));
  select count(*) into n from public.rate_limits
   where bucket = p_bucket and key_hash = p_key_hash and created_at > now() - p_window;
  if n >= p_limit then
    return false;
  end if;
  insert into public.rate_limits (bucket, key_hash) values (p_bucket, p_key_hash);
  -- Хуучирсан мөрийг цэвэрлэнэ (2 хоногоос дээш)
  delete from public.rate_limits where created_at < now() - interval '2 days';
  return true;
end $$;

-- ─── Лого хадгалах bucket (private, ≤5MB, PNG/JPG/WEBP) ────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ─── Хандалт ───────────────────────────────────────────────────
alter table public.businesses      enable row level security;
alter table public.custom_requests enable row level security;
alter table public.rate_limits     enable row level security;

revoke all on function public.hit_rate_limit(text, text, integer, interval) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, text, integer, interval) to service_role;
