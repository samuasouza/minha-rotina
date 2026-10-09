create table public.cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  performed_on date not null,
  activity public.cardio_activity not null,
  custom_label text,
  duration_minutes integer not null,
  distance_km numeric(6, 2),
  speed_kmh numeric(5, 2),
  incline_percent numeric(4, 1),
  intensity public.cardio_intensity,
  heart_rate_bpm integer,
  energy_kcal numeric(8, 2),
  energy_kind public.energy_kind not null default 'none',
  formula text,
  weight_kg_used numeric(5, 2),
  external_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cardio_sessions_duration check (duration_minutes between 1 and 1440),
  constraint cardio_sessions_distance check (distance_km is null or (distance_km >= 0 and distance_km <= 500)),
  constraint cardio_sessions_speed check (speed_kmh is null or (speed_kmh > 0 and speed_kmh <= 80)),
  constraint cardio_sessions_incline check (incline_percent is null or (incline_percent >= 0 and incline_percent <= 40)),
  constraint cardio_sessions_heart check (heart_rate_bpm is null or heart_rate_bpm between 30 and 230),
  constraint cardio_sessions_label check (
    (activity = 'other' and custom_label is not null and char_length(btrim(custom_label)) between 1 and 80)
    or (activity <> 'other' and custom_label is null)
  ),
  constraint cardio_sessions_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint cardio_sessions_external_unique unique (user_id, external_ref),
  constraint cardio_sessions_energy check (
    (
      energy_kind = 'none'
      and energy_kcal is null
      and formula is null
      and weight_kg_used is null
    )
    or (
      energy_kind = 'informed'
      and energy_kcal is not null
      and energy_kcal >= 0
      and energy_kcal < 10000
      and formula is null
      and weight_kg_used is null
    )
    or (
      energy_kind = 'acsm_estimate'
      and energy_kcal is not null
      and energy_kcal >= 0
      and formula in ('acsm_walking_v1', 'acsm_running_v1')
      and weight_kg_used is not null
      and weight_kg_used > 0
      and speed_kmh is not null
      and incline_percent is not null
    )
  )
);

comment on column public.cardio_sessions.energy_kcal is
  'Um único valor por sessão. acsm_estimate é cálculo, informed é número digitado pela pessoa. Não há segunda coluna para somar de novo.';

create table public.cardio_week_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_starts_on date not null,
  target_sessions integer not null,
  target_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cardio_week_goals_unique unique (user_id, week_starts_on),
  constraint cardio_week_goals_monday check (extract(isodow from week_starts_on) = 1),
  constraint cardio_week_goals_sessions check (target_sessions between 1 and 14),
  constraint cardio_week_goals_minutes check (target_minutes is null or target_minutes between 1 and 2000)
);

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recorded_on date not null,
  weight_kg numeric(5, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_weights_day_unique unique (user_id, recorded_on),
  constraint body_weights_range check (weight_kg between 20 and 400),
  constraint body_weights_notes_length check (notes is null or char_length(notes) <= 500)
);

create table public.measure_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  unit text not null default 'cm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint measure_definitions_name_unique unique (user_id, name),
  constraint measure_definitions_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint measure_definitions_unit_length check (char_length(btrim(unit)) between 1 and 12)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  definition_id uuid not null references public.measure_definitions (id) on delete cascade,
  recorded_on date not null,
  value numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_measurements_day_unique unique (definition_id, recorded_on),
  constraint body_measurements_value check (value > 0 and value < 500)
);

create table public.body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recorded_on date not null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  constraint body_photos_path_unique unique (user_id, storage_path),
  constraint body_photos_private_path check (storage_path = user_id::text || '/' || id::text),
  constraint body_photos_caption_length check (caption is null or char_length(caption) <= 160)
);

create table public.wellbeing_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  sleep_hours numeric(4, 2),
  sleep_quality smallint,
  energy smallint,
  mood smallint,
  menstruation boolean,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellbeing_entries_day_unique unique (user_id, entry_date),
  constraint wellbeing_entries_sleep check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  constraint wellbeing_entries_quality check (sleep_quality is null or sleep_quality between 1 and 5),
  constraint wellbeing_entries_energy check (energy is null or energy between 1 and 5),
  constraint wellbeing_entries_mood check (mood is null or mood between 1 and 5),
  constraint wellbeing_entries_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint wellbeing_entries_some check (
    sleep_hours is not null or sleep_quality is not null or energy is not null
    or mood is not null or menstruation is not null or notes is not null
  )
);

create index foods_user_idx on public.foods (user_id, name);
create index meal_templates_user_idx on public.meal_templates (user_id) where is_favorite;
create index meal_template_items_template_idx on public.meal_template_items (template_id);
create index meal_template_items_food_idx on public.meal_template_items (food_id);
create index meal_logs_user_day_idx on public.meal_logs (user_id, eaten_on);
create index meal_log_items_meal_idx on public.meal_log_items (meal_log_id);
create index water_logs_user_day_idx on public.water_logs (user_id, logged_on);
create index nutrition_targets_user_idx on public.nutrition_targets (user_id, starts_on desc);
create index diet_plans_user_idx on public.diet_plans (user_id, created_at desc);
create index diet_meals_plan_idx on public.diet_meals (plan_id, position);
create index diet_items_meal_idx on public.diet_items (meal_id, position);
create index diet_items_food_idx on public.diet_items (food_id);
create index food_substitutions_item_idx on public.food_substitutions (diet_item_id, created_at desc);
create index cardio_sessions_user_day_idx on public.cardio_sessions (user_id, performed_on);
create index body_weights_user_day_idx on public.body_weights (user_id, recorded_on desc);
create index measure_definitions_user_idx on public.measure_definitions (user_id, name);
create index body_measurements_user_day_idx on public.body_measurements (user_id, recorded_on desc);
create index body_photos_user_day_idx on public.body_photos (user_id, recorded_on desc);
create index wellbeing_entries_user_day_idx on public.wellbeing_entries (user_id, entry_date desc);

create function private.enforce_health_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid;
begin
  if tg_table_name = 'meal_template_items' then
    select template.user_id into owner from public.meal_templates as template where template.id = new.template_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    select food.user_id into owner from public.foods as food where food.id = new.food_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'meal_log_items' then
    select meal.user_id into owner from public.meal_logs as meal where meal.id = new.meal_log_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    if new.food_id is not null then
      select food.user_id into owner from public.foods as food where food.id = new.food_id;
      if owner is distinct from new.user_id then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'diet_meals' then
    select plan.user_id into owner from public.diet_plans as plan where plan.id = new.plan_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'diet_items' then
    select meal.user_id into owner from public.diet_meals as meal where meal.id = new.meal_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    if new.food_id is not null then
      select food.user_id into owner from public.foods as food where food.id = new.food_id;
      if owner is distinct from new.user_id then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'food_substitutions' then
    select item.user_id into owner from public.diet_items as item where item.id = new.diet_item_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    select food.user_id into owner from public.foods as food where food.id = new.suggested_food_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'body_measurements' then
    select definition.user_id into owner
    from public.measure_definitions as definition
    where definition.id = new.definition_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_health_ownership() from public, anon, authenticated;
grant execute on function private.enforce_health_ownership() to authenticated;

create trigger meal_template_items_owner
  before insert or update on public.meal_template_items
  for each row execute function private.enforce_health_ownership();
create trigger meal_log_items_owner
  before insert or update on public.meal_log_items
  for each row execute function private.enforce_health_ownership();
create trigger diet_meals_owner
  before insert or update on public.diet_meals
  for each row execute function private.enforce_health_ownership();
create trigger diet_items_owner
  before insert or update on public.diet_items
  for each row execute function private.enforce_health_ownership();
create trigger food_substitutions_owner
  before insert or update on public.food_substitutions
  for each row execute function private.enforce_health_ownership();
create trigger body_measurements_owner
  before insert or update on public.body_measurements
  for each row execute function private.enforce_health_ownership();

do $updated$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'foods', 'meal_templates', 'meal_template_items', 'meal_logs', 'nutrition_targets',
    'diet_plans', 'diet_meals', 'diet_items', 'food_substitutions', 'cardio_sessions',
    'cardio_week_goals', 'body_weights', 'measure_definitions', 'body_measurements',
    'wellbeing_entries'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      owned_table || '_set_updated_at',
      owned_table
    );
  end loop;
end
$updated$;

do $policies$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'foods', 'meal_templates', 'meal_template_items', 'meal_logs', 'meal_log_items',
    'water_logs', 'nutrition_targets', 'diet_plans', 'diet_meals', 'diet_items',
    'food_substitutions', 'cardio_sessions', 'cardio_week_goals', 'body_weights',
    'measure_definitions', 'body_measurements', 'body_photos', 'wellbeing_entries'
  ]
  loop
    execute format('alter table public.%I enable row level security', owned_table);
    execute format('revoke all on table public.%I from anon, public', owned_table);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', owned_table);
    execute format(
      'create policy select_own on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      owned_table
    );
    execute format(
      'create policy insert_own on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      owned_table
    );
    execute format(
      'create policy update_own on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      owned_table
    );
    execute format(
      'create policy delete_own on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      owned_table
    );
  end loop;
end
$policies$;

