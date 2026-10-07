-- Uruchomić dopiero po przeglądzie i zastosowaniu migracji płatności.
-- Wyłącznie syntetyczne dane; brak połączenia z P24 i obowiązkowy ROLLBACK.
-- Dowodzi izolacji/stanów w pojedynczej transakcji, nie symuluje dwóch sesji równolegle.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(43);

insert into auth.users(id, email) values
 ('71000000-0000-4000-8000-000000000001', 'synthetic-payment-a@example.invalid'),
 ('71000000-0000-4000-8000-000000000002', 'synthetic-payment-b@example.invalid');

create temporary table copowiesz_payment_test_payloads(label text primary key, payload jsonb);
insert into copowiesz_payment_test_payloads(label,payload)
select label, jsonb_build_object(
 'id',order_id,'owner_id',owner_id,'session_id',order_id,'idempotency_key',request_id,
 'caller_hash',repeat('a',64),'environment','sandbox','merchant_id',123,'pos_id',123,
 'email','synthetic-payment-' || label || '@example.invalid','amount_cents',1700,'currency','PLN',
 'offer_version',repeat('b',64),
 'product_snapshot',jsonb_build_object('id','synthetic-test-package','title','Syntetyczny pakiet',
  'description','Oferta wyłącznie do testu bazy, bez rzeczywistej sprzedaży.',
  'amountCents',1700,'currency','PLN','durationDays',7,'maxPets',2,'chatLimit',12,'analysisLimit',3,'version','test-v1'),
 'agreements_snapshot',jsonb_build_object('termsVersion','test-v1','privacyVersion','test-v1',
  'termsText',repeat('Syntetyczny regulamin. ',20),'privacyText',repeat('Syntetyczna prywatność. ',15),
  'termsUrl','https://copowiesz.example/regulamin','privacyUrl','https://copowiesz.example/polityka-prywatnosci',
  'withdrawalText',repeat('Pełne prawo odstąpienia 14 dni. ',5),'withdrawalDays',14,
  'acceptedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'acceptTerms',true,'acknowledgePrivacy',true,'requestImmediateService',true,'confirmAdult',true),
 'receipt_text',repeat('Syntetyczny trwały dokument zamówienia, bez prawdziwej sprzedaży. ',10),
 'created_at',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
from (values
 ('a','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001'),
 ('b','72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002','73000000-0000-4000-8000-000000000002')
) as synthetic(label,order_id,owner_id,request_id);
grant select on copowiesz_payment_test_payloads to service_role;

select ok(not has_table_privilege('authenticated','public.copowiesz_payment_orders','INSERT'),'Klient nie ma INSERT zamówień');
select ok(not has_table_privilege('authenticated','public.copowiesz_payment_orders','UPDATE'),'Klient nie ma UPDATE zamówień');
select ok(not has_table_privilege('authenticated','public.copowiesz_payment_entitlements','DELETE'),'Klient nie ma DELETE uprawnień');
select ok(not has_table_privilege('anon','public.copowiesz_payment_orders','SELECT'),'Anon nie ma SELECT zamówień');
select ok(not has_function_privilege('authenticated','public.copowiesz_create_payment_order(jsonb)','EXECUTE'),'Tworzenie zamówienia nie jest publicznym RPC');
select ok(not has_function_privilege('authenticated','public.copowiesz_complete_p24_order(uuid,uuid,bigint,integer,text,text,integer,integer)','EXECUTE'),'Klient nie może wykonać RPC nadania dostępu');
select ok(has_function_privilege('service_role','public.copowiesz_complete_p24_order(uuid,uuid,bigint,integer,text,text,integer,integer)','EXECUTE'),'Serwer ma jawne EXECUTE potwierdzenia');
select ok((select relrowsecurity from pg_class where oid='public.copowiesz_payment_orders'::regclass),'Zamówienia mają włączone RLS');
select ok((select relrowsecurity from pg_class where oid='public.copowiesz_payment_entitlements'::regclass),'Uprawnienia mają włączone RLS');

set local role service_role;
select lives_ok($$select * from public.copowiesz_create_payment_order((select payload from pg_temp.copowiesz_payment_test_payloads where label='a'))$$,'Serwer tworzy syntetyczne zamówienie A');
select lives_ok($$select * from public.copowiesz_create_payment_order((select payload from pg_temp.copowiesz_payment_test_payloads where label='b'))$$,'Serwer tworzy syntetyczne zamówienie B');
select is((select receipt_sha256 from public.copowiesz_payment_orders where id='72000000-0000-4000-8000-000000000001'),
 encode(sha256(convert_to((select payload->>'receipt_text' from pg_temp.copowiesz_payment_test_payloads where label='a'),'UTF8')),'hex'),'Baza zapisuje hash pełnego dokumentu');
select is((select count(*)::integer from public.copowiesz_payment_entitlements where owner_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002')),0,'Utworzenie zamówień nie nadaje dostępu');
select is((select id::text from public.copowiesz_create_payment_order((select payload from pg_temp.copowiesz_payment_test_payloads where label='a'))),
 '72000000-0000-4000-8000-000000000001','Ten sam klucz idempotencji zwraca pierwotne zamówienie');
select is((select count(*)::integer from public.copowiesz_payment_orders where owner_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002')),2,'Ponowienie nie tworzy trzeciego zamówienia');
select throws_ok($$select * from public.copowiesz_create_payment_order(
 (select jsonb_set(payload,'{offer_version}',to_jsonb(repeat('c',64))) from pg_temp.copowiesz_payment_test_payloads where label='a'))$$,
 '23514','payment_idempotency_mismatch','Nie można użyć starego klucza dla innej oferty');
select throws_ok($$select * from public.copowiesz_create_payment_order(
 (select payload || '{"id":"72000000-0000-4000-8000-000000000003","session_id":"72000000-0000-4000-8000-000000000003","idempotency_key":"73000000-0000-4000-8000-000000000003","amount_cents":1}'::jsonb
 from pg_temp.copowiesz_payment_test_payloads where label='a'))$$,'23514','payment_order_mismatch','Kwota musi odpowiadać niezmiennej ofercie');
select throws_ok($$select * from public.copowiesz_create_payment_order(
 (select jsonb_set(payload || '{"id":"72000000-0000-4000-8000-000000000003","session_id":"72000000-0000-4000-8000-000000000003","idempotency_key":"73000000-0000-4000-8000-000000000003"}'::jsonb,
 '{agreements_snapshot,confirmAdult}','false') from pg_temp.copowiesz_payment_test_payloads where label='a'))$$,'23514','payment_order_mismatch','Brak potwierdzenia pełnoletniości blokuje zapis');
select throws_ok($$select * from public.copowiesz_create_payment_order(
 (select jsonb_set(payload || '{"id":"72000000-0000-4000-8000-000000000003","session_id":"72000000-0000-4000-8000-000000000003","idempotency_key":"73000000-0000-4000-8000-000000000003"}'::jsonb,
 '{product_snapshot,chatLimit}','0') from pg_temp.copowiesz_payment_test_payloads where label='a'))$$,'23514','payment_order_mismatch','Zakres czatu musi być dodatni i skończony');
select throws_ok($$update public.copowiesz_payment_orders set amount_cents=1 where id='72000000-0000-4000-8000-000000000001'$$,
 '23514','payment_snapshot_immutable','Nawet zmiana stanu przez serwer nie może nadpisać kwoty');
select lives_ok($$select public.copowiesz_register_payment_order('72000000-0000-4000-8000-000000000001','synthetic-payment-token-a')$$,'Token rejestracji można zapisać raz');
select throws_ok($$select public.copowiesz_register_payment_order('72000000-0000-4000-8000-000000000001','synthetic-payment-token-other')$$,
 '23514','payment_state_conflict','Nie można zastąpić zarejestrowanego tokenu');
select throws_ok($$select public.copowiesz_complete_p24_order('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',456,1,'PLN','sandbox',123,123)$$,
 '23514','payment_order_mismatch','Potwierdzenie innej kwoty nie nadaje dostępu');
select throws_ok($$select public.copowiesz_complete_p24_order('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',456,1700,'PLN','production',123,123)$$,
 '23514','payment_order_mismatch','Sandbox nie staje się zakupem produkcyjnym');
select lives_ok($$select public.copowiesz_complete_p24_order('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',456,1700,'PLN','sandbox',123,123)$$,'Serwer nadaje dostęp po zewnętrznej weryfikacji P24');
select is((select status from public.copowiesz_payment_orders where id='72000000-0000-4000-8000-000000000001'),'paid','Potwierdzone zamówienie ma stan paid');
select is((select jsonb_build_array(max_pets,chat_limit,analysis_limit,chat_used,analysis_used,environment) from public.copowiesz_payment_entitlements where order_id='72000000-0000-4000-8000-000000000001'),
 '[2,12,3,0,0,"sandbox"]'::jsonb,'Zakres uprawnienia pochodzi z zaakceptowanej oferty');
select is((select ends_at-starts_at from public.copowiesz_payment_entitlements where order_id='72000000-0000-4000-8000-000000000001'),interval '7 days','Dostęp ma dokładnie zakontraktowany okres');
select is(public.copowiesz_complete_p24_order('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',456,1700,'PLN','sandbox',123,123)->>'already','true','Duplikat potwierdzenia jest rozpoznany');
select is((select count(*)::integer from public.copowiesz_payment_entitlements where order_id='72000000-0000-4000-8000-000000000001'),1,'Duplikat nie nadaje drugiego dostępu');
select throws_ok($$select public.copowiesz_complete_p24_order('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',457,1700,'PLN','sandbox',123,123)$$,
 '23514','payment_order_mismatch','Inny identyfikator operatora nie zastępuje opłaconej transakcji');

set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::integer from public.copowiesz_payment_orders),1,'Konto A widzi wyłącznie swoje zamówienie');
select is((select count(*)::integer from public.copowiesz_payment_orders where owner_id='71000000-0000-4000-8000-000000000002'),0,'Konto A nie odczytuje zamówienia B');
select is((select count(*)::integer from public.copowiesz_payment_entitlements),1,'Konto A widzi tylko swoje uprawnienie');
select throws_ok($$update public.copowiesz_payment_orders set status='paid' where id='72000000-0000-4000-8000-000000000001'$$,
 '42501',null,'Klient nie zapisuje statusu paid');
select throws_ok($$select * from public.copowiesz_create_payment_order('{}'::jsonb)$$,'42501',null,'Klient nie wywołuje serwerowego tworzenia zamówień');
select throws_ok($$select public.copowiesz_complete_p24_order('72000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002',458,1700,'PLN','sandbox',123,123)$$,
 '42501',null,'Klient nie nadaje dostępu przez RPC');
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.copowiesz_payment_orders),1,'Konto B widzi wyłącznie swoje zamówienie');
select is((select count(*)::integer from public.copowiesz_payment_entitlements),0,'Konto B nie widzi dostępu A');
set local role anon;
select throws_ok($$select * from public.copowiesz_payment_orders$$,'42501',null,'Niezalogowana osoba nie odczytuje dokumentów zamówień');
select throws_ok($$select * from public.copowiesz_payment_entitlements$$,'42501',null,'Niezalogowana osoba nie odczytuje uprawnień');

set local role service_role;
select throws_ok($$insert into public.copowiesz_payment_entitlements(order_id,owner_id,environment,starts_at,ends_at,max_pets,chat_limit,analysis_limit)
 values('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','sandbox',now(),now()+interval '1 day',1,1,0)$$,
 '23503',null,'Klucz obcy zabrania dostępu przypisanego do cudzego zamówienia');
select throws_ok($$update public.copowiesz_payment_orders set agreements_snapshot=jsonb_set(agreements_snapshot,'{termsText}','"Podmieniony regulamin"')
 where id='72000000-0000-4000-8000-000000000001'$$,'23514','payment_snapshot_immutable','Zaakceptowanych dokumentów nie można podmienić po wpłacie');
reset role;
select * from finish();
rollback;
