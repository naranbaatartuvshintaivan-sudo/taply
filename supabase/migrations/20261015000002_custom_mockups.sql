-- TAPLY Phase 3 · Шат 2: 3 загвар автоматаар + admin
-- Хүсэлтэд загварын багц, зургийн хавтас, хугацааны тэмдэглэгээ нэмнэ. Зураг хадгалах public bucket.

-- design_set: хэд дэх удаагаа үүсгэж буй нь (0 = хараахан үүсгээгүй). Layout-ийн багц нь
--   (design_set - 1) % <багцын тоо> — "Дахин үүсгэх" бүрт өөр бүтэц гарна.
--   Шат 4 (хэвлэх файл) нь ижил design_set-ээр сонгосон загварыг дахин рендэрлэнэ.
-- mockup_dir: mockups bucket доторх санамсаргүй uuid хавтас (<dir>/A.png, <dir>/A-face.png, …).
--   Дахин үүсгэхэд шинэ хавтас үүснэ; хуучин имэйл дэх зураг эвдрэхгүй.
alter table public.custom_requests
  add column design_set    integer not null default 0 check (design_set >= 0),
  add column mockup_dir    uuid,
  add column generated_at  timestamptz,
  add column sent_at       timestamptz;

-- ─── Загварын зураг (public, ≤5MB, зөвхөн PNG) ──────────────────
-- Имэйл, Telegram-д шууд харагдахын тулд public. Зам нь таамаглах боломжгүй uuid.
-- Эх лого (logos) private хэвээр.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mockups', 'mockups', true, 5242880, array['image/png'])
on conflict (id) do nothing;
