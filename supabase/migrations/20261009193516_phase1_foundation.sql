-- Fase 1: perfis, preferências, tarefas, recorrências e agenda.
-- Cada linha pertence a um usuário. O compartilhamento seletivo fica preparado
-- em resource_shares, sem liberar leitura cruzada nas tabelas de conteúdo.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres;

create type public.task_priority as enum ('low', 'normal', 'high');
create type public.task_status as enum ('pending', 'completed', 'skipped', 'rescheduled');
create type public.completion_policy as enum ('checklist', 'module_record');
create type public.linked_module as enum (
  'none',
  'devotional',
  'workout',
  'study',
  'nutrition',
  'cardio',
  'body',
  'wellbeing',
  'agenda'
);
create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'rescheduled');
create type public.share_permission as enum ('read', 'write');
create type public.share_resource as enum ('profile', 'task', 'appointment', 'routine');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  full_name text,
  avatar_path text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 80),
  constraint profiles_full_name_length check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  constraint profiles_timezone_known check (
    timezone in (
      'America/Sao_Paulo',
      'America/Manaus',
      'America/Rio_Branco',
      'America/Noronha',
      'America/Fortaleza',
      'America/Belem',
      'America/Cuiaba',
      'UTC'
    )
  )
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  locale text not null default 'pt-BR',
  week_starts_on smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_locale_length check (char_length(locale) between 2 and 16),
  constraint user_preferences_week_start check (week_starts_on between 0 and 6)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text not null default '#C7A4A0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 40),
  constraint categories_color_length check (char_length(color) between 4 and 32),
  constraint categories_user_name_unique unique (user_id, name)
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  category_id uuid references public.categories (id) on delete set null,
  priority public.task_priority not null default 'normal',
  is_optional boolean not null default false,
  days_of_week smallint[] not null,
  time_of_day time,
  completion_policy public.completion_policy not null default 'checklist',
  linked_module public.linked_module not null default 'none',
  is_active boolean not null default true,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint routines_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint routines_days_valid check (
    cardinality(days_of_week) > 0
    and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint routines_date_range check (ends_on is null or ends_on >= starts_on)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  title text not null,
  notes text,
  category_id uuid references public.categories (id) on delete set null,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'pending',
  is_optional boolean not null default false,
  scheduled_on date not null,
  time_of_day time,
  completed_at timestamptz,
  skipped_reason text,
  rescheduled_to date,
  completion_policy public.completion_policy not null default 'checklist',
  linked_module public.linked_module not null default 'none',
  linked_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint tasks_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint tasks_skip_reason check (
    status <> 'skipped'
    or (skipped_reason is not null and char_length(btrim(skipped_reason)) between 1 and 280)
  ),
  constraint tasks_reschedule check (
    status <> 'rescheduled' or (rescheduled_to is not null and rescheduled_to <> scheduled_on)
  ),
  constraint tasks_completed_at check (status <> 'completed' or completed_at is not null)
);

create unique index tasks_routine_occurrence_uidx
  on public.tasks (user_id, routine_id, scheduled_on)
  where routine_id is not null;

create index tasks_user_day_idx on public.tasks (user_id, scheduled_on);
create index tasks_routine_id_idx on public.tasks (routine_id);
create index tasks_category_id_idx on public.tasks (category_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  location text,
  scheduled_on date not null,
  starts_at time,
  ends_at time,
  status public.appointment_status not null default 'scheduled',
  category_id uuid references public.categories (id) on delete set null,
  rescheduled_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint appointments_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint appointments_location_length check (location is null or char_length(location) <= 160),
  constraint appointments_time_order check (
    starts_at is null or ends_at is null or ends_at > starts_at
  ),
  constraint appointments_reschedule check (
    status <> 'rescheduled' or (rescheduled_to is not null and rescheduled_to <> scheduled_on)
  )
);

create index appointments_user_day_idx on public.appointments (user_id, scheduled_on);
create index appointments_category_id_idx on public.appointments (category_id);
create index routines_user_active_idx on public.routines (user_id) where is_active;
create index routines_category_id_idx on public.routines (category_id);
create index categories_user_idx on public.categories (user_id);

create table public.resource_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  grantee_id uuid not null references public.profiles (id) on delete cascade,
  resource_type public.share_resource not null,
  resource_id uuid not null,
  permission public.share_permission not null default 'read',
  created_at timestamptz not null default now(),
  constraint resource_shares_not_self check (owner_id <> grantee_id),
  constraint resource_shares_unique unique (owner_id, grantee_id, resource_type, resource_id)
);

create index resource_shares_owner_idx on public.resource_shares (owner_id);
create index resource_shares_grantee_idx on public.resource_shares (grantee_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create function private.enforce_task_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1
    from public.categories as category
    where category.id = new.category_id
      and category.user_id = new.user_id
  ) then
    raise exception 'invalid_category' using errcode = '23514';
  end if;

  if new.routine_id is not null and not exists (
    select 1
    from public.routines as routine
    where routine.id = new.routine_id
      and routine.user_id = new.user_id
  ) then
    raise exception 'invalid_routine' using errcode = '23514';
  end if;

  if new.status = 'completed'
    and new.completion_policy = 'module_record'
    and new.linked_record_id is null then
    raise exception 'module_record_required' using errcode = '23514';
  end if;

  if new.status = 'completed' then
    if new.completed_at is null then
      new.completed_at = pg_catalog.now();
    end if;
  else
    new.completed_at = null;
  end if;

  if new.status <> 'skipped' then
    new.skipped_reason = null;
  end if;

  if new.status <> 'rescheduled' then
    new.rescheduled_to = null;
  end if;

  return new;
end;
$$;

create function private.enforce_category_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1
    from public.categories as category
    where category.id = new.category_id
      and category.user_id = new.user_id
  ) then
    raise exception 'invalid_category' using errcode = '23514';
  end if;

  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name = left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Eu'
    ),
    80
  );

  insert into public.profiles (id, display_name)
  values (new.id, chosen_name);

  insert into public.user_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.enforce_task_integrity() from public;
revoke all on function private.enforce_category_owner() from public;
revoke all on function private.handle_new_user() from public;

grant usage on schema private to authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.set_updated_at() to authenticated;
grant execute on function private.enforce_task_integrity() to authenticated;
grant execute on function private.enforce_category_owner() to authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function private.set_updated_at();

create trigger routines_enforce_category
  before insert or update on public.routines
  for each row execute function private.enforce_category_owner();

create trigger tasks_enforce_integrity
  before insert or update on public.tasks
  for each row execute function private.enforce_task_integrity();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

create trigger appointments_enforce_category
  before insert or update on public.appointments
  for each row execute function private.enforce_category_owner();

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function private.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function public.ensure_routine_tasks(target_date date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  day_of_week smallint;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if target_date is null then
    raise exception 'invalid_date' using errcode = '22007';
  end if;

  day_of_week = extract(dow from target_date)::smallint;

  insert into public.tasks (
    user_id,
    routine_id,
    title,
    notes,
    category_id,
    priority,
    is_optional,
    scheduled_on,
    time_of_day,
    completion_policy,
    linked_module
  )
  select
    routine.user_id,
    routine.id,
    routine.title,
    routine.notes,
    routine.category_id,
    routine.priority,
    routine.is_optional,
    target_date,
    routine.time_of_day,
    routine.completion_policy,
    routine.linked_module
  from public.routines as routine
  where routine.user_id = (select auth.uid())
    and routine.is_active
    and target_date >= routine.starts_on
    and (routine.ends_on is null or target_date <= routine.ends_on)
    and day_of_week = any (routine.days_of_week)
  on conflict (user_id, routine_id, scheduled_on) where routine_id is not null do nothing;
end;
$$;

create function public.reschedule_task(task_id uuid, target_date date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_task public.tasks%rowtype;
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if target_date is null then
    raise exception 'invalid_date' using errcode = '22007';
  end if;

  select *
  into current_task
  from public.tasks
  where id = task_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if current_task.status not in ('pending', 'skipped') then
    raise exception 'not_reschedulable' using errcode = 'P0001';
  end if;

  if target_date = current_task.scheduled_on then
    raise exception 'same_date' using errcode = 'P0001';
  end if;

  if current_task.routine_id is not null and exists (
    select 1
    from public.tasks as existing
    where existing.user_id = current_task.user_id
      and existing.routine_id = current_task.routine_id
      and existing.scheduled_on = target_date
      and existing.status <> 'rescheduled'
  ) then
    raise exception 'already_scheduled' using errcode = 'P0001';
  end if;

  update public.tasks
  set
    status = 'rescheduled',
    rescheduled_to = target_date
  where id = current_task.id;

  insert into public.tasks (
    user_id,
    title,
    notes,
    category_id,
    priority,
    is_optional,
    scheduled_on,
    time_of_day,
    completion_policy,
    linked_module,
    linked_record_id
  )
  values (
    current_task.user_id,
    current_task.title,
    current_task.notes,
    current_task.category_id,
    current_task.priority,
    current_task.is_optional,
    target_date,
    current_task.time_of_day,
    current_task.completion_policy,
    current_task.linked_module,
    current_task.linked_record_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

create function public.reschedule_appointment(appointment_id uuid, target_date date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_appointment public.appointments%rowtype;
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if target_date is null then
    raise exception 'invalid_date' using errcode = '22007';
  end if;

  select *
  into current_appointment
  from public.appointments
  where id = appointment_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'appointment_not_found' using errcode = 'P0001';
  end if;

  if current_appointment.status <> 'scheduled' then
    raise exception 'not_reschedulable' using errcode = 'P0001';
  end if;

  if target_date = current_appointment.scheduled_on then
    raise exception 'same_date' using errcode = 'P0001';
  end if;

  update public.appointments
  set
    status = 'rescheduled',
    rescheduled_to = target_date
  where id = current_appointment.id;

  insert into public.appointments (
    user_id,
    title,
    notes,
    location,
    scheduled_on,
    starts_at,
    ends_at,
    category_id
  )
  values (
    current_appointment.user_id,
    current_appointment.title,
    current_appointment.notes,
    current_appointment.location,
    target_date,
    current_appointment.starts_at,
    current_appointment.ends_at,
    current_appointment.category_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.ensure_routine_tasks(date) from public, anon;
revoke all on function public.reschedule_task(uuid, date) from public, anon;
revoke all on function public.reschedule_appointment(uuid, date) from public, anon;
grant execute on function public.ensure_routine_tasks(date) to authenticated;
grant execute on function public.reschedule_task(uuid, date) to authenticated;
grant execute on function public.reschedule_appointment(uuid, date) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;
alter table public.routines enable row level security;
alter table public.tasks enable row level security;
alter table public.appointments enable row level security;
alter table public.resource_shares enable row level security;

revoke all on table public.profiles from anon, public;
revoke all on table public.user_preferences from anon, public;
revoke all on table public.categories from anon, public;
revoke all on table public.routines from anon, public;
revoke all on table public.tasks from anon, public;
revoke all on table public.appointments from anon, public;
revoke all on table public.resource_shares from anon, public;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_preferences to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.routines to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.appointments to authenticated;
grant select, insert, update, delete on table public.resource_shares to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy user_preferences_select on public.user_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_preferences_insert on public.user_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy user_preferences_update on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy categories_select on public.categories
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy categories_insert on public.categories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy categories_update on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy categories_delete on public.categories
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy routines_select on public.routines
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy routines_insert on public.routines
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy routines_update on public.routines
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy routines_delete on public.routines
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_select on public.tasks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy tasks_update on public.tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy appointments_select on public.appointments
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy appointments_update on public.appointments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy appointments_delete on public.appointments
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy resource_shares_select on public.resource_shares
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or grantee_id = (select auth.uid())
  );

create policy resource_shares_insert on public.resource_shares
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy resource_shares_update on public.resource_shares
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy resource_shares_delete on public.resource_shares
  for delete to authenticated
  using (owner_id = (select auth.uid()));

comment on table public.resource_shares is
  'Preparado para compartilhamento seletivo. As políticas das tabelas de conteúdo continuam restritas ao dono até a leitura compartilhada ser implementada e testada.';
