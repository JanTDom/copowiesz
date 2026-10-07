-- COPOWIESZ: prywatne profile i metadane filmów. Przygotowane lokalnie, niewdrożone.
begin;

create schema if not exists copowiesz_private;
revoke all on schema copowiesz_private from public, anon, authenticated;

create table public.copowiesz_pets (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  constraint pet_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint pet_payload_identity check (coalesce(payload #>> '{pet,id}' = id::text, false)),
  constraint pet_payload_species check (coalesce(payload #>> '{pet,species}' in ('dog', 'cat'), false)),
  constraint pet_payload_name check (coalesce(length(btrim(payload #>> '{pet,name}')) between 1 and 80, false)),
  constraint pet_payload_arrays check (
    coalesce(jsonb_typeof(payload -> 'answers') = 'object', false)
    and coalesce(jsonb_typeof(payload -> 'clips') = 'array', false)
    and coalesce(jsonb_typeof(payload -> 'memories') = 'array', false)
    and coalesce(jsonb_typeof(payload -> 'messages') = 'array', false)
  ),
  constraint real_pet_only check (coalesce(payload ->> 'isDemo', 'false') = 'false')
);

create table public.copowiesz_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  active_pet_id uuid,
  updated_at timestamptz not null default now(),
  foreign key (owner_id, active_pet_id) references public.copowiesz_pets(owner_id, id)
);

create table public.copowiesz_clip_assets (
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null,
  clip_id uuid not null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('video/webm', 'video/mp4', 'video/quicktime')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  created_at timestamptz not null default now(),
  primary key (owner_id, pet_id, clip_id),
  foreign key (owner_id, pet_id) references public.copowiesz_pets(owner_id, id) on delete cascade,
  constraint clip_path_identity check (
    object_path = owner_id::text || '/' || pet_id::text || '/' || clip_id::text ||
      case mime_type when 'video/webm' then '.webm' when 'video/mp4' then '.mp4' else '.mov' end
  )
);

create index copowiesz_pets_owner_updated on public.copowiesz_pets(owner_id, updated_at);
create index copowiesz_workspaces_active_pet on public.copowiesz_workspaces(owner_id, active_pet_id);
-- PK clip_assets pokrywa owner_id/pet_id i klucz obcy; object_path ma indeks unique.

create function copowiesz_private.touch_pet_revision()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function copowiesz_private.touch_pet_revision() from public, anon, authenticated;
create trigger copowiesz_pet_revision before update on public.copowiesz_pets
for each row execute function copowiesz_private.touch_pet_revision();

alter table public.copowiesz_pets enable row level security;
alter table public.copowiesz_workspaces enable row level security;
alter table public.copowiesz_clip_assets enable row level security;

revoke all on public.copowiesz_pets, public.copowiesz_workspaces, public.copowiesz_clip_assets from public, anon;
grant select, insert, update, delete on public.copowiesz_pets, public.copowiesz_workspaces, public.copowiesz_clip_assets to authenticated;

create policy pets_select_owner on public.copowiesz_pets for select to authenticated using ((select auth.uid()) = owner_id);
create policy pets_insert_owner on public.copowiesz_pets for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy pets_update_owner on public.copowiesz_pets for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy pets_delete_owner on public.copowiesz_pets for delete to authenticated using ((select auth.uid()) = owner_id);

create policy workspace_select_owner on public.copowiesz_workspaces for select to authenticated using ((select auth.uid()) = owner_id);
create policy workspace_insert_owner on public.copowiesz_workspaces for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy workspace_update_owner on public.copowiesz_workspaces for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy workspace_delete_owner on public.copowiesz_workspaces for delete to authenticated using ((select auth.uid()) = owner_id);

create policy clips_select_owner on public.copowiesz_clip_assets for select to authenticated using ((select auth.uid()) = owner_id);
create policy clips_insert_owner on public.copowiesz_clip_assets for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy clips_update_owner on public.copowiesz_clip_assets for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy clips_delete_owner on public.copowiesz_clip_assets for delete to authenticated using ((select auth.uid()) = owner_id);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('copowiesz-clips', 'copowiesz-clips', false, 52428800, array['video/webm', 'video/mp4', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- SELECT wymaga prywatnego prefiksu użytkownika oraz posiadania wskazanego profilu.
-- INSERT/UPDATE wymagają dodatkowo metadanych klipu z kluczem obcym do tego profilu.
create policy copowiesz_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'copowiesz-clips'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.copowiesz_pets p
    where p.owner_id = (select auth.uid()) and p.id::text = (storage.foldername(name))[2]
  )
);
create policy copowiesz_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'copowiesz-clips'
  and exists (
    select 1 from public.copowiesz_clip_assets c
    where c.owner_id = (select auth.uid()) and c.object_path = name
  )
);
create policy copowiesz_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'copowiesz-clips'
  and exists (select 1 from public.copowiesz_clip_assets c where c.owner_id = (select auth.uid()) and c.object_path = name)
) with check (
  bucket_id = 'copowiesz-clips'
  and exists (select 1 from public.copowiesz_clip_assets c where c.owner_id = (select auth.uid()) and c.object_path = name)
);
-- Właściciel może sprzątnąć plik także po usunięciu metadanych. Nigdy cudzy prefiks.
create policy copowiesz_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'copowiesz-clips'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

comment on table public.copowiesz_pets is 'Prywatny PetRecord v1; relacje, hipotezy i niezweryfikowane wyniki modelu zachowują swoje pochodzenie.';
comment on table public.copowiesz_clip_assets is 'Metadane prywatnych filmów. Usunięcie wiersza nie usuwa bajtów Storage: używać Storage API przed usunięciem profilu.';
commit;
