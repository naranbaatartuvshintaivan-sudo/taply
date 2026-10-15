-- TAPLY Phase 3 · Шат 3: загвар сонгох, төлбөр (/c/<token>)
-- Apply хийхээс өмнө эзэмшигчийн зөвшөөрөл шаардлагатай.

-- ─── a) Загварын багц бүрийн бүртгэл ──────────────────────────
-- Генераци бүр энд нэг мөр бичнэ. custom_requests.design_set / mockup_dir нь "сүүлийнх" заагч хэвээр.
-- Имэйлийн линк /c/<token>?d=A&s=<design_set> — хуучин багцын линк ч зөв зургаа олно.
create table public.custom_mockup_sets (
  request_id  uuid not null references public.custom_requests (id) on delete cascade,
  design_set  integer not null check (design_set >= 1),
  mockup_dir  uuid not null,
  created_at  timestamptz not null default now(),
  primary key (request_id, design_set)
);

-- Одоо байгаа (сүүлийн) багцуудыг шилжүүлнэ. Өмнөх багцын хавтас custom_requests-д
-- хадгалагдаагүй тул зөвхөн сүүлийнх backfill болно.
insert into public.custom_mockup_sets (request_id, design_set, mockup_dir, created_at)
select id, design_set, mockup_dir, coalesce(generated_at, updated_at)
  from public.custom_requests
 where mockup_dir is not null and design_set >= 1
on conflict do nothing;

-- ─── b) Сонголт + хүргэлтийн snapshot ─────────────────────────
-- Захиалга үүсгэхэд businesses-ийг БИШ, эдгээр snapshot-ыг ашиглана
-- (дараа нь ижил утсаар өөр хүсэлт ирж businesses шинэчлэгдсэн ч энэ хүсэлт өөрчлөгдөхгүй).
alter table public.custom_requests
  add column chosen_set  integer check (chosen_set is null or chosen_set >= 1),
  add column chosen_at   timestamptz,
  add column phone       text,
  add column district    text,
  add column address     text;

update public.custom_requests r
   set phone = b.phone, district = b.district, address = b.address
  from public.businesses b
 where b.id = r.business_id and r.phone is null;

-- Backfill-ийн дараа заавал (шинэ мөрийг сервер snapshot-тай бичнэ)
alter table public.custom_requests
  alter column phone    set not null,
  alter column district set not null,
  alter column address  set not null,
  add constraint custom_requests_phone_check check (phone ~ '^[0-9]{8}$');

-- ─── c) Нэг хүсэлтэд ЗӨВХӨН нэг төлөгдсөн захиалга ───────────
-- Хоёр дахь захиалга төлөгдвөл mark_order_paid-ийн UPDATE 23505-аар унана → сервер
-- "Давхар төлбөр — буцаалт хийх" ⚠️ илгээнэ, захиалгыг paid болгохгүй.
create unique index orders_one_paid_per_custom_request
  on public.orders (custom_request_id)
  where custom_request_id is not null and status in ('paid', 'in_production', 'delivered');

-- Давхар дарахад давхар захиалга үүсэхгүй: нэг хүсэлтэд нэг л хүлээгдэж буй (pending) захиалга.
-- Тоо/загвар өөрчлөгдвөл сервер хуучныг цуцлаад (Wire intent-ийг cancel) шинийг үүсгэнэ.
create unique index orders_one_pending_per_custom_request
  on public.orders (custom_request_id)
  where custom_request_id is not null and status = 'pending_payment';

-- ─── Хандалт ───────────────────────────────────────────────────
alter table public.custom_mockup_sets enable row level security;
