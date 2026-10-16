-- Давхар хамгаалалт: RLS асаалттай, policy байхгүй тул anon/authenticated одоо ч хандаж чадахгүй.
-- Гэхдээ Supabase-ийн анхдагч GRANT үлдсэн байна — хэн нэгэн санамсаргүй policy нэмэх эсвэл RLS унтраавал
-- шууд нээгдэнэ. Сайт зөвхөн service role-оор (сервер) хандана, тиймээс эрхийг бүрмөсөн хасна.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- Ирээдүйд үүсэх объектод ч анхдагчаар эрх өгөхгүй
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

-- service role-ийн эрх хэвээр (RLS-ийг тойрдог)
grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
