-- Test po migracji, z syntetycznymi danymi i obowiązkowym rollback. Nie tworzy prawdziwych plików.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

insert into auth.users(id, email) values
 ('00000000-0000-4000-8000-000000000001', 'synthetic-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000002', 'synthetic-b@example.invalid');
insert into public.copowiesz_pets(owner_id,id,payload) values
 ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '{"pet":{"id":"10000000-0000-4000-8000-000000000001","name":"Syntetyczny kot","species":"cat"},"answers":{},"clips":[],"memories":[],"messages":[]}'),
 ('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',
  '{"pet":{"id":"10000000-0000-4000-8000-000000000002","name":"Syntetyczny pies","species":"dog"},"answers":{},"clips":[],"memories":[],"messages":[]}');
insert into public.copowiesz_clip_assets(owner_id,pet_id,clip_id,object_path,mime_type,byte_size) values
 ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001.webm','video/webm',100);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::integer from public.copowiesz_pets),1,'Konto A widzi tylko własny profil');
select is((select count(*)::integer from public.copowiesz_pets where owner_id='00000000-0000-4000-8000-000000000002'),0,'Konto A nie odczytuje profilu B');
select throws_ok($$
  insert into public.copowiesz_pets(owner_id,id,payload) values
  ('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003',
   '{"pet":{"id":"10000000-0000-4000-8000-000000000003","name":"Obcy","species":"cat"},"answers":{},"clips":[],"memories":[],"messages":[]}')
$$,'42501',null,'Konto A nie tworzy profilu właściciela B');
select throws_ok($$
  update public.copowiesz_pets set owner_id='00000000-0000-4000-8000-000000000002'
  where id='10000000-0000-4000-8000-000000000001'
$$,'42501',null,'Nie można przepisać profilu na cudze konto');
select throws_ok($$
  insert into public.copowiesz_clip_assets(owner_id,pet_id,clip_id,object_path,mime_type,byte_size) values
  ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003',
   '00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000003.webm','video/webm',100)
$$,'23503',null,'Klucz obcy zabrania przypięcia klipu do cudzego zwierzaka');
select throws_ok($$
  insert into public.copowiesz_workspaces(owner_id,active_pet_id) values
  ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')
$$,'23503',null,'Aktywny profil musi należeć do konta');
select throws_ok($$
  insert into storage.objects(bucket_id,name) values
  ('copowiesz-clips','00000000-0000-4000-8000-000000000002/10000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000002.webm')
$$,'42501',null,'Konto A nie zapisuje w cudzym prefiksie Storage');
select lives_ok($$
  insert into storage.objects(bucket_id,name) values
  ('copowiesz-clips','00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001.webm')
$$,'Własny klip ze zgodnymi metadanymi może powstać');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from storage.objects where bucket_id='copowiesz-clips'),0,'Konto B nie odczytuje klipu A');
-- Supabase blokuje surowy DELETE Storage nawet dla właściciela; bajty usuwa Storage API.
select throws_ok($$
 delete from storage.objects where bucket_id='copowiesz-clips'
$$,'42501',null,'Platforma blokuje bezpośrednie kasowanie metadanych Storage przez SQL');
with changed as (
 update public.copowiesz_pets set payload=jsonb_set(payload,'{pet,name}','"Nadpisany"')
 where id='10000000-0000-4000-8000-000000000001' returning id
)
select is((select count(*)::integer from changed),0,'Konto B nie aktualizuje profilu A');
with deleted as (
 delete from public.copowiesz_pets where id='10000000-0000-4000-8000-000000000001' returning id
)
select is((select count(*)::integer from deleted),0,'Konto B nie usuwa profilu A');
select lives_ok($$
 update public.copowiesz_pets set payload=jsonb_set(payload,'{pet,name}','"Syntetyczny pies po zmianie"')
 where id='10000000-0000-4000-8000-000000000002'
$$,'Właściciel B może zaktualizować swój profil');
select is((select revision::integer from public.copowiesz_pets where id='10000000-0000-4000-8000-000000000002'),2,'Aktualizacja własnego profilu zwiększa wersję');

reset role;
select * from finish();
rollback;
