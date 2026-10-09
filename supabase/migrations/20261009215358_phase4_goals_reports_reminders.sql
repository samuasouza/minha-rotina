-- Personal goals, revision history, manual check-ins, and in-app reminders.
-- Automatic progress is calculated in the application from existing module records.
-- Reminders are shown inside the app. They are not push notifications.

create type public.goal_period as enum ('daily', 'weekly', 'monthly', 'custom');
create type public.goal_category as enum (
  'devotional',
  'training',
  'study',
  'nutrition',
  'hydration',
  'cardio',
  'body',
  'wellbeing',
  'habit'
);
create type public.goal_measure as enum (
  'manual',
  'devotional_days',
  'workout_sessions',
  'training_volume',
  'study_minutes',
  'nutrition_kcal',
  'nutrition_protein',
  'water_ml',
  'cardio_sessions',
  'cardio_minutes',
  'body_weight',
  'sleep_hours'
);
create type public.goal_status as enum ('active', 'paused', 'completed', 'archived');
create type public.reminder_kind as enum (
  'devotional',
  'training',
  'study',
  'water',
  'appointment',
  'goal'
);

create table public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category public.goal_category not null,
  measure public.goal_measure not null,
  target_value numeric not null,
  unit text not null,
  period public.goal_period not null,
  custom_days smallint,
  starts_on date not null,
  ends_on date,
  status public.goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_goals_title_length check (char_length(title) between 1 and 120),
  constraint personal_goals_target_range check (target_value > 0 and target_value < 1000000),
  constraint personal_goals_unit_length check (char_length(unit) between 1 and 20),
  constraint personal_goals_custom_days check (
    (period = 'custom' and custom_days between 1 and 366)
    or (period <> 'custom' and custom_days is null)
  ),
  constraint personal_goals_date_order check (ends_on is null or ends_on >= starts_on)
);

create table public.personal_goal_revisions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.personal_goals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  target_value numeric not null,
  unit text not null,
  period public.goal_period not null,
  starts_on date not null,
  ends_on date,
  status public.goal_status not null,
  recorded_at timestamptz not null default now()
);

create table public.goal_checkins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.personal_goals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  recorded_on date not null,
  amount numeric not null,
  note text,
  created_at timestamptz not null default now(),
  constraint goal_checkins_unique_day unique (goal_id, recorded_on),
  constraint goal_checkins_amount_range check (amount > 0 and amount < 1000000),
  constraint goal_checkins_note_length check (note is null or char_length(note) <= 280)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  kind public.reminder_kind not null,
  goal_id uuid references public.personal_goals (id) on delete set null,
  enabled boolean not null default true,
  remind_at time not null,
  weekdays smallint[] not null,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_title_length check (char_length(title) between 1 and 120),
  constraint reminders_weekdays check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint reminders_goal_link check (goal_id is null or kind = 'goal')
);

comment on table public.reminders is
  'In-app reminders only. Delivery does not use push, email, or an external notification service.';

create index personal_goals_user_status_idx on public.personal_goals (user_id, status);
create index personal_goal_revisions_goal_idx on public.personal_goal_revisions (goal_id, recorded_at desc);
create index goal_checkins_user_date_idx on public.goal_checkins (user_id, recorded_on);
create index reminders_user_enabled_idx on public.reminders (user_id) where enabled;

create or replace function private.record_goal_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.personal_goal_revisions (
    goal_id,
    user_id,
    title,
    target_value,
    unit,
    period,
    starts_on,
    ends_on,
    status
  )
  values (
    old.id,
    old.user_id,
    old.title,
    old.target_value,
    old.unit,
    old.period,
    old.starts_on,
    old.ends_on,
    old.status
  );
  return new;
end;
$$;

create trigger personal_goals_revision
  before update on public.personal_goals
  for each row
  execute function private.record_goal_revision();

create trigger personal_goals_updated_at
  before update on public.personal_goals
  for each row
  execute function private.set_updated_at();

create trigger reminders_updated_at
  before update on public.reminders
  for each row
  execute function private.set_updated_at();

create or replace function private.enforce_manual_checkin()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid;
  current_measure public.goal_measure;
begin
  select user_id, measure
    into owner_id, current_measure
  from public.personal_goals
  where id = new.goal_id;

  if owner_id is null or owner_id <> new.user_id then
    raise exception 'A meta não pertence a este usuário.' using errcode = '42501';
  end if;

  if current_measure <> 'manual' then
    raise exception 'Esta meta é calculada pelos registros do módulo e não aceita lançamento manual.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger goal_checkins_manual_only
  before insert or update on public.goal_checkins
  for each row
  execute function private.enforce_manual_checkin();

create or replace function private.enforce_reminder_goal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if new.goal_id is null then
    return new;
  end if;

  select user_id into owner_id
  from public.personal_goals
  where id = new.goal_id;

  if owner_id is null or owner_id <> new.user_id then
    raise exception 'A meta do lembrete não pertence a este usuário.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger reminders_goal_owner
  before insert or update on public.reminders
  for each row
  execute function private.enforce_reminder_goal();

revoke all on function private.record_goal_revision() from public, anon, authenticated;
revoke all on function private.enforce_manual_checkin() from public, anon, authenticated;
revoke all on function private.enforce_reminder_goal() from public, anon, authenticated;

alter table public.personal_goals enable row level security;
alter table public.personal_goal_revisions enable row level security;
alter table public.goal_checkins enable row level security;
alter table public.reminders enable row level security;

create policy select_own on public.personal_goals
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy insert_own on public.personal_goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy update_own on public.personal_goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy delete_own on public.personal_goals
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy select_own on public.personal_goal_revisions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy select_own on public.goal_checkins
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy insert_own on public.goal_checkins
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy update_own on public.goal_checkins
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy delete_own on public.goal_checkins
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy select_own on public.reminders
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy insert_own on public.reminders
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy update_own on public.reminders
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy delete_own on public.reminders
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.personal_goals from public, anon;
revoke all on public.personal_goal_revisions from public, anon;
revoke all on public.goal_checkins from public, anon;
revoke all on public.reminders from public, anon;

grant select, insert, update, delete on public.personal_goals to authenticated;
grant select on public.personal_goal_revisions to authenticated;
grant select, insert, update, delete on public.goal_checkins to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
