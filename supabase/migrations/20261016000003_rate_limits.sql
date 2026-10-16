-- Rate limit (IP / имэйлийн hash) — lib/guard.ts, lib/rate-limit.ts ашиглана.
-- Эх: site/custom-system салбарын 20261015000001_custom_requests.sql-ийн зөвхөн rate_limits
-- хүснэгт ба hit_rate_limit функц (custom-ийн хүснэгт, баганыг энд оруулаагүй).
-- Prod-д аль хэдийн бий (custom_requests migration-оор) → энэ файл prod дээр юу ч өөрчлөхгүй.
-- Шинэ орчин (preview DB, local) main-аас эхэлбэл rate limit ажиллахын тулд хэрэгтэй.
-- Бүгд idempotent: дахин ажиллуулахад алдаагүй, үр дүн ижил.

-- ─── Хүснэгт ───────────────────────────────────────────────────
-- Түлхүүр нь hash (IP эсвэл имэйл нь шууд хадгалагдахгүй).
create table if not exists public.rate_limits (
  id          bigint generated always as identity primary key,
  bucket      text not null,      -- жишээ нь 'order_create_ip', 'custom_email'
  key_hash    text not null,      -- HMAC-SHA256(CRON_SECRET, bucket:утга), hex
  created_at  timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx on public.rate_limits (bucket, key_hash, created_at);

-- ─── Функц ─────────────────────────────────────────────────────
-- Цонхон дахь тоог шалгаад, хязгаарт хүрээгүй бол бичнэ. Зэрэг хүсэлтэд
-- advisory lock-оор нэг түлхүүрийг дараалуулна. true = зөвшөөрнө.
-- Доорх тодорхойлолт prod-ын pg_get_functiondef-тэй үсэг үсгээрээ ижил.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_bucket text, p_key_hash text, p_limit integer, p_window interval)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$
;

-- ─── Хандалт: зөвхөн сервер (service_role) ─────────────────────
-- RLS асаалттай, policy байхгүй. anon/authenticated-д эрх огт өгөхгүй.
alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from public, anon, authenticated;
revoke all on sequence public.rate_limits_id_seq from public, anon, authenticated;
grant all on table public.rate_limits to service_role;
grant all on sequence public.rate_limits_id_seq to service_role;

revoke all on function public.hit_rate_limit(text, text, integer, interval) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, text, integer, interval) to service_role;
