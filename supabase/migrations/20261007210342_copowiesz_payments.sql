-- Backend P24 z prywatnymi zamówieniami. Sprzedaż produkcyjna pozostaje wyłączona.
-- Użytkownik odczytuje tylko własne zamówienia/uprawnienia. Mutacje wyłącznie service_role.
create table public.copowiesz_payment_orders (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  session_id uuid not null unique,
  idempotency_key uuid not null,
  caller_hash text not null check (caller_hash ~ '^[a-f0-9]{64}$'),
  environment text not null check (environment in ('sandbox', 'production')),
  merchant_id integer not null check (merchant_id > 0),
  pos_id integer not null check (pos_id > 0),
  email text not null check (char_length(email) between 3 and 254),
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  currency text not null check (currency = 'PLN'),
  offer_version text not null check (offer_version ~ '^[a-f0-9]{64}$'),
  product_snapshot jsonb not null check (jsonb_typeof(product_snapshot) = 'object'),
  agreements_snapshot jsonb not null check (jsonb_typeof(agreements_snapshot) = 'object'),
  receipt_text text not null check (char_length(receipt_text) between 300 and 90000),
  receipt_sha256 text not null check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'registration_failed', 'cancelled', 'refunded')),
  provider_token text check (provider_token ~ '^[a-zA-Z0-9_-]{10,200}$'),
  p24_order_id bigint check (p24_order_id between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint copowiesz_payment_owner_request_unique unique (owner_id, idempotency_key),
  constraint copowiesz_payment_order_owner_unique unique (id, owner_id),
  constraint copowiesz_payment_provider_order_unique unique (environment, p24_order_id),
  constraint copowiesz_payment_provider_token_unique unique (environment, provider_token),
  constraint copowiesz_payment_paid_fields check (status <> 'paid' or (p24_order_id is not null and paid_at is not null))
);
create index copowiesz_payment_orders_owner_created_idx on public.copowiesz_payment_orders(owner_id, created_at);
create index copowiesz_payment_orders_caller_created_idx on public.copowiesz_payment_orders(caller_hash, created_at);
create index copowiesz_payment_orders_created_idx on public.copowiesz_payment_orders(created_at);

create table public.copowiesz_payment_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  owner_id uuid not null,
  environment text not null check (environment in ('sandbox', 'production')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  max_pets integer not null check (max_pets between 1 and 20),
  chat_limit integer not null check (chat_limit between 1 and 100000),
  analysis_limit integer not null check (analysis_limit between 0 and 10000),
  chat_used integer not null default 0 check (chat_used between 0 and chat_limit),
  analysis_used integer not null default 0 check (analysis_used between 0 and analysis_limit),
  foreign key (order_id, owner_id) references public.copowiesz_payment_orders(id, owner_id) on delete restrict
);
create index copowiesz_payment_entitlements_owner_idx on public.copowiesz_payment_entitlements(owner_id);

alter table public.copowiesz_payment_orders enable row level security;
alter table public.copowiesz_payment_entitlements enable row level security;
revoke all on public.copowiesz_payment_orders, public.copowiesz_payment_entitlements from public, anon, authenticated;
grant select on public.copowiesz_payment_orders, public.copowiesz_payment_entitlements to authenticated;
grant select, insert, update, delete on public.copowiesz_payment_orders, public.copowiesz_payment_entitlements to service_role;
create policy copowiesz_payment_orders_read_own on public.copowiesz_payment_orders for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy copowiesz_payment_entitlements_read_own on public.copowiesz_payment_entitlements for select to authenticated
  using ((select auth.uid()) = owner_id);

-- Accepted facts, documents, owner, amount and environment cannot change with a status update.
create function public.copowiesz_guard_payment_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (to_jsonb(new) - array['status', 'provider_token', 'p24_order_id', 'paid_at'])
     is distinct from (to_jsonb(old) - array['status', 'provider_token', 'p24_order_id', 'paid_at']) then
    raise exception 'payment_snapshot_immutable' using errcode = '23514';
  end if;
  if old.p24_order_id is not null and new.p24_order_id is distinct from old.p24_order_id then
    raise exception 'payment_order_mismatch' using errcode = '23514';
  end if;
  if old.paid_at is not null and new.paid_at is distinct from old.paid_at then
    raise exception 'payment_snapshot_immutable' using errcode = '23514';
  end if;
  if old.provider_token is not null and new.provider_token is distinct from old.provider_token then
    raise exception 'payment_snapshot_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.copowiesz_guard_payment_snapshot() from public, anon, authenticated;
grant execute on function public.copowiesz_guard_payment_snapshot() to service_role;
create trigger copowiesz_payment_snapshot_immutable before update on public.copowiesz_payment_orders
  for each row execute function public.copowiesz_guard_payment_snapshot();

create function public.copowiesz_create_payment_order(p_order jsonb)
returns setof public.copowiesz_payment_orders
language plpgsql security invoker set search_path = '' as $$
declare
  existing public.copowiesz_payment_orders;
  p_owner uuid := (p_order->>'owner_id')::uuid;
  p_key uuid := (p_order->>'idempotency_key')::uuid;
  product jsonb := p_order->'product_snapshot';
  agreements jsonb := p_order->'agreements_snapshot';
  created timestamptz := (p_order->>'created_at')::timestamptz;
begin
  if current_user <> 'service_role' then raise insufficient_privilege; end if;
  -- Low-volume safety cap and idempotency are serialized across all server instances.
  perform pg_advisory_xact_lock(hashtextextended('copowiesz:payment-registry', 0));
  select * into existing from public.copowiesz_payment_orders where owner_id = p_owner and idempotency_key = p_key;
  if found then
    if existing.offer_version is distinct from p_order->>'offer_version'
      or existing.environment is distinct from p_order->>'environment'
      or existing.email is distinct from p_order->>'email' then
      raise exception 'payment_idempotency_mismatch' using errcode = '23514';
    end if;
    return next existing;
    return;
  end if;
  if (select count(*) from public.copowiesz_payment_orders where owner_id = p_owner and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.copowiesz_payment_orders where caller_hash = p_order->>'caller_hash' and created_at > now() - interval '1 hour') >= 20
    or (select count(*) from public.copowiesz_payment_orders where created_at > now() - interval '24 hours') >= 100 then
    raise exception 'payment_rate_limit' using errcode = 'P0001';
  end if;
  if jsonb_typeof(product) is distinct from 'object' or jsonb_typeof(agreements) is distinct from 'object'
    or (product->>'amountCents')::integer is distinct from (p_order->>'amount_cents')::integer
    or product->>'currency' is distinct from 'PLN'
    or coalesce((product->>'durationDays')::integer, 0) not between 1 and 366
    or coalesce((product->>'maxPets')::integer, 0) not between 1 and 20
    or coalesce((product->>'chatLimit')::integer, 0) not between 1 and 100000
    or coalesce((product->>'analysisLimit')::integer, -1) not between 0 and 10000
    or agreements->'acceptTerms' is distinct from 'true'::jsonb
    or agreements->'acknowledgePrivacy' is distinct from 'true'::jsonb
    or agreements->'requestImmediateService' is distinct from 'true'::jsonb
    or agreements->'confirmAdult' is distinct from 'true'::jsonb
    or agreements->'withdrawalDays' is distinct from '14'::jsonb
    or coalesce(char_length(agreements->>'termsText'), 0) not between 300 and 32000
    or coalesce(char_length(agreements->>'privacyText'), 0) not between 200 and 32000
    or coalesce(char_length(agreements->>'withdrawalText'), 0) < 100
    or (p_order->>'id')::uuid is distinct from (p_order->>'session_id')::uuid
    or created is null or created < now() - interval '5 minutes' or created > now() + interval '1 minute' then
    raise exception 'payment_order_mismatch' using errcode = '23514';
  end if;
  return query insert into public.copowiesz_payment_orders (
    id, owner_id, session_id, idempotency_key, caller_hash, environment, merchant_id, pos_id,
    email, amount_cents, currency, offer_version, product_snapshot, agreements_snapshot, receipt_text, receipt_sha256, created_at
  ) values (
    (p_order->>'id')::uuid, p_owner, (p_order->>'session_id')::uuid, p_key, p_order->>'caller_hash',
    p_order->>'environment', (p_order->>'merchant_id')::integer, (p_order->>'pos_id')::integer,
    p_order->>'email', (p_order->>'amount_cents')::integer, p_order->>'currency', p_order->>'offer_version',
    product, agreements, p_order->>'receipt_text', encode(sha256(convert_to(p_order->>'receipt_text', 'UTF8')), 'hex'), created
  ) returning *;
end;
$$;

create function public.copowiesz_register_payment_order(p_order_id uuid, p_provider_token text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'service_role' then raise insufficient_privilege; end if;
  if p_provider_token is null or p_provider_token !~ '^[a-zA-Z0-9_-]{10,200}$' then
    raise exception 'payment_order_mismatch' using errcode = '23514';
  end if;
  update public.copowiesz_payment_orders set provider_token = p_provider_token
    where id = p_order_id and provider_token is null and status in ('pending', 'paid');
  if not found and not exists (select 1 from public.copowiesz_payment_orders where id = p_order_id and provider_token = p_provider_token) then
    raise exception 'payment_state_conflict' using errcode = '23514';
  end if;
end;
$$;

create function public.copowiesz_fail_payment_registration(p_order_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'service_role' then raise insufficient_privilege; end if;
  update public.copowiesz_payment_orders set status = 'registration_failed'
    where id = p_order_id and status = 'pending' and provider_token is null;
end;
$$;

-- Called only after the backend checked the P24 notification signature AND transaction/verify.
-- Row lock, paid status and entitlement insert are one transaction. A replay cannot add access twice.
create function public.copowiesz_complete_p24_order(
  p_order_id uuid, p_session_id uuid, p_p24_order_id bigint, p_amount_cents integer,
  p_currency text, p_environment text, p_merchant_id integer, p_pos_id integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target public.copowiesz_payment_orders;
  entitlement_id uuid;
  paid_time timestamptz := clock_timestamp();
begin
  if current_user <> 'service_role' then raise insufficient_privilege; end if;
  select * into target from public.copowiesz_payment_orders where id = p_order_id for update;
  if not found or target.session_id is distinct from p_session_id
    or target.amount_cents is distinct from p_amount_cents or target.currency is distinct from p_currency
    or target.environment is distinct from p_environment or target.merchant_id is distinct from p_merchant_id
    or target.pos_id is distinct from p_pos_id or p_p24_order_id is null
    or p_p24_order_id not between 1 and 9007199254740991
    or (target.p24_order_id is not null and target.p24_order_id is distinct from p_p24_order_id) then
    raise exception 'payment_order_mismatch' using errcode = '23514';
  end if;
  if target.status = 'paid' then
    select id into entitlement_id from public.copowiesz_payment_entitlements where order_id = target.id;
    if entitlement_id is null then raise exception 'payment_state_conflict' using errcode = '23514'; end if;
    return jsonb_build_object('already', true, 'orderId', target.id, 'entitlementId', entitlement_id);
  end if;
  if target.status not in ('pending', 'registration_failed') then
    raise exception 'payment_state_conflict' using errcode = '23514';
  end if;
  update public.copowiesz_payment_orders set status = 'paid', paid_at = paid_time, p24_order_id = p_p24_order_id where id = target.id;
  insert into public.copowiesz_payment_entitlements (
    order_id, owner_id, environment, starts_at, ends_at, max_pets, chat_limit, analysis_limit
  ) values (
    target.id, target.owner_id, target.environment, paid_time,
    paid_time + make_interval(days => (target.product_snapshot->>'durationDays')::integer),
    (target.product_snapshot->>'maxPets')::integer, (target.product_snapshot->>'chatLimit')::integer,
    (target.product_snapshot->>'analysisLimit')::integer
  ) returning id into entitlement_id;
  return jsonb_build_object('already', false, 'orderId', target.id, 'entitlementId', entitlement_id);
end;
$$;

revoke execute on function public.copowiesz_create_payment_order(jsonb) from public, anon, authenticated;
revoke execute on function public.copowiesz_register_payment_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.copowiesz_fail_payment_registration(uuid) from public, anon, authenticated;
revoke execute on function public.copowiesz_complete_p24_order(uuid, uuid, bigint, integer, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.copowiesz_create_payment_order(jsonb) to service_role;
grant execute on function public.copowiesz_register_payment_order(uuid, text) to service_role;
grant execute on function public.copowiesz_fail_payment_registration(uuid) to service_role;
grant execute on function public.copowiesz_complete_p24_order(uuid, uuid, bigint, integer, text, text, integer, integer) to service_role;

comment on table public.copowiesz_payment_entitlements is 'Przygotowana ewidencja zakupów. Obecny bezpłatny czat i analiza nie konsumują tych limitów. Sandbox nigdy nie jest dostępem produkcyjnym.';
