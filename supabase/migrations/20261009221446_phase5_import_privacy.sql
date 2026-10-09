-- Import drafts stay unpublished until the owner confirms them.
-- Account deletion requests do not remove the Auth identity by themselves.

create type public.import_module as enum (
  'diet',
  'workout',
  'study',
  'schedule',
  'water',
  'meal'
);
create type public.import_source as enum ('pdf', 'image', 'text', 'audio');
create type public.import_status as enum (
  'awaiting_provider',
  'ready_for_review',
  'confirmed',
  'discarded'
);

create table public.import_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module public.import_module not null,
  source_kind public.import_source not null,
  source_name text,
  storage_path text,
  source_text text,
  status public.import_status not null default 'awaiting_provider',
  proposal jsonb,
  review_note text,
  extraction_attempts smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint import_drafts_name_length check (source_name is null or char_length(source_name) between 1 and 180),
  constraint import_drafts_text_length check (source_text is null or char_length(source_text) <= 20000),
  constraint import_drafts_note_length check (review_note is null or char_length(review_note) <= 500),
  constraint import_drafts_attempts check (extraction_attempts between 0 and 2),
  constraint import_drafts_path_owner check (
    storage_path is null or storage_path like (user_id::text || '/%')
  ),
  constraint import_drafts_has_source check (storage_path is not null or source_text is not null),
  constraint import_drafts_confirmed check (
    (status = 'confirmed' and confirmed_at is not null)
    or (status <> 'confirmed' and confirmed_at is null)
  )
);

comment on table public.import_drafts is
  'A draft is not module data. Rows in diet, workout, study, and schedule tables are written only after confirmation.';

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  confirmed_email text not null,
  status text not null default 'pending_identity',
  created_at timestamptz not null default now(),
  constraint account_deletion_requests_status check (status = 'pending_identity'),
  constraint account_deletion_requests_email_length check (char_length(confirmed_email) between 3 and 320)
);

comment on table public.account_deletion_requests is
  'Records an explicit deletion request. It does not delete auth.users. Identity removal needs the server secret or the Supabase dashboard. Platform backups follow the host retention policy.';

create unique index account_deletion_requests_open_idx
  on public.account_deletion_requests (user_id);

create index import_drafts_user_status_idx on public.import_drafts (user_id, status);

create trigger import_drafts_updated_at
  before update on public.import_drafts
  for each row execute function private.set_updated_at();

alter table public.import_drafts enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy select_own on public.import_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy insert_own on public.import_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy update_own on public.import_drafts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy delete_own on public.import_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy select_own on public.account_deletion_requests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy insert_own on public.account_deletion_requests
  for insert to authenticated with check ((select auth.uid()) = user_id);

revoke all on public.import_drafts from public, anon;
revoke all on public.account_deletion_requests from public, anon;
grant select, insert, update, delete on public.import_drafts to authenticated;
grant select, insert on public.account_deletion_requests to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imports',
  'imports',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy imports_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy imports_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy imports_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy imports_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
