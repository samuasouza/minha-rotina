-- Fase 3.5: anamnese e onboarding.
-- Nome permanece em profiles. Peso e medidas do corpo permanecem nas tabelas
-- já existentes. Esta migration não reescreve histórico.

create type public.measurement_system as enum ('metric', 'imperial');
create type public.biological_sex as enum ('female', 'male');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'active');
create type public.day_period as enum ('morning', 'afternoon', 'evening', 'flexible');
create type public.anamnesis_goal as enum (
  'fat_loss',
  'muscle_gain',
  'recomposition',
  'conditioning',
  'maintenance',
  'wellbeing',
  'other'
);

alter table public.user_preferences
  add column measurement_system public.measurement_system not null default 'metric';

create table public.anamnesis (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date,
  height_cm numeric(5, 2),
  biological_sex public.biological_sex,
  strength_sessions_per_week smallint,
  cardio_sessions_per_week smallint,
  activity_level public.activity_level,
  typical_sleep_hours numeric(4, 2),
  weekly_availability_minutes integer,
  preferred_period public.day_period,
  injuries text,
  dietary_restrictions text,
  food_allergies text,
  food_preferences text,
  nutritionist_followup boolean,
  notes text,
  track_sleep boolean not null default false,
  track_energy boolean not null default false,
  track_mood boolean not null default false,
  track_cycle boolean not null default false,
  current_step smallint not null default 1,
  completed_at timestamptz,
  deferred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anamnesis_birth_date check (birth_date is null or birth_date >= date '1900-01-01'),
  constraint anamnesis_height check (height_cm is null or (height_cm between 50 and 250)),
  constraint anamnesis_sessions check (
    (strength_sessions_per_week is null or strength_sessions_per_week between 0 and 14)
    and (cardio_sessions_per_week is null or cardio_sessions_per_week between 0 and 14)
  ),
  constraint anamnesis_sleep check (typical_sleep_hours is null or (typical_sleep_hours >= 0 and typical_sleep_hours <= 24)),
  constraint anamnesis_availability check (
    weekly_availability_minutes is null or weekly_availability_minutes between 0 and 3000
  ),
  constraint anamnesis_text check (
    (injuries is null or char_length(injuries) <= 2000)
    and (dietary_restrictions is null or char_length(dietary_restrictions) <= 2000)
    and (food_allergies is null or char_length(food_allergies) <= 2000)
    and (food_preferences is null or char_length(food_preferences) <= 2000)
    and (notes is null or char_length(notes) <= 4000)
  ),
  constraint anamnesis_step check (current_step between 1 and 5)
);

comment on column public.anamnesis.biological_sex is
  'Opcional. Não é diagnóstico. A estimativa ACSM atual não usa este campo.';

comment on column public.anamnesis.typical_sleep_hours is
  'Rotina habitual. Não substitui o registro diário de bem-estar.';

create table public.anamnesis_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal public.anamnesis_goal not null,
  custom_label text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint anamnesis_goals_label check (
    (goal = 'other' and custom_label is not null and char_length(btrim(custom_label)) between 1 and 80)
    or (goal <> 'other' and custom_label is null)
  )
);

create unique index anamnesis_goals_primary_idx
  on public.anamnesis_goals (user_id) where is_primary;

create unique index anamnesis_goals_kind_idx
  on public.anamnesis_goals (user_id, goal) where goal <> 'other';

create unique index anamnesis_goals_custom_idx
  on public.anamnesis_goals (user_id, custom_label) where goal = 'other';

create index anamnesis_goals_user_idx on public.anamnesis_goals (user_id);

create trigger anamnesis_set_updated_at
  before update on public.anamnesis
  for each row execute function private.set_updated_at();

alter table public.anamnesis enable row level security;
alter table public.anamnesis_goals enable row level security;

revoke all on table public.anamnesis from public, anon;
revoke all on table public.anamnesis_goals from public, anon;
grant select, insert, update, delete on table public.anamnesis to authenticated;
grant select, insert, update, delete on table public.anamnesis_goals to authenticated;

create policy select_own on public.anamnesis
  for select to authenticated using (user_id = (select auth.uid()));
create policy insert_own on public.anamnesis
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy update_own on public.anamnesis
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy delete_own on public.anamnesis
  for delete to authenticated using (user_id = (select auth.uid()));

create policy select_own on public.anamnesis_goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy insert_own on public.anamnesis_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy update_own on public.anamnesis_goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy delete_own on public.anamnesis_goals
  for delete to authenticated using (user_id = (select auth.uid()));
