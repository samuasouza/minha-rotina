-- Fase 3: alimentação, cardio, corpo e bem-estar.
-- Cada linha pertence a uma conta. Substituição alimentar e estimativa de
-- cardio não reescrevem o plano original nem somam o mesmo gasto duas vezes.

create type public.food_unit as enum ('g', 'ml', 'unit');
create type public.substitution_status as enum ('pending', 'accepted', 'rejected');
create type public.cardio_activity as enum ('treadmill', 'walk', 'run', 'cycle', 'other');
create type public.cardio_intensity as enum ('easy', 'moderate', 'vigorous');
create type public.energy_kind as enum ('none', 'acsm_estimate', 'informed');

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  basis_quantity numeric(8, 2) not null,
  basis_unit public.food_unit not null,
  kcal numeric(8, 2) not null,
  protein_g numeric(8, 2) not null,
  carbs_g numeric(8, 2) not null,
  fat_g numeric(8, 2) not null,
  source_note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint foods_basis check (basis_quantity > 0 and basis_quantity <= 10000),
  constraint foods_macros check (
    kcal >= 0 and kcal < 10000
    and protein_g >= 0 and protein_g < 1000
    and carbs_g >= 0 and carbs_g < 1000
    and fat_g >= 0 and fat_g < 1000
  ),
  constraint foods_source_length check (char_length(btrim(source_note)) between 1 and 160)
);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_favorite boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_templates_name_length check (char_length(btrim(name)) between 1 and 80)
);

create table public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_templates (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  quantity numeric(8, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_template_items_quantity check (quantity > 0 and quantity <= 10000)
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  eaten_on date not null,
  name text not null,
  template_id uuid references public.meal_templates (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_logs_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint meal_logs_notes_length check (notes is null or char_length(notes) <= 1000)
);

create table public.meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name_snapshot text not null,
  quantity numeric(8, 2) not null,
  unit public.food_unit not null,
  kcal numeric(8, 2) not null,
  protein_g numeric(8, 2) not null,
  carbs_g numeric(8, 2) not null,
  fat_g numeric(8, 2) not null,
  source_note text not null,
  created_at timestamptz not null default now(),
  constraint meal_log_items_quantity check (quantity > 0 and quantity <= 10000),
  constraint meal_log_items_macros check (
    kcal >= 0 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0
  )
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  logged_on date not null,
  milliliters integer not null,
  created_at timestamptz not null default now(),
  constraint water_logs_amount check (milliliters between 1 and 5000)
);

create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null,
  kcal numeric(8, 2),
  protein_g numeric(8, 2),
  carbs_g numeric(8, 2),
  fat_g numeric(8, 2),
  water_ml integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_targets_day_unique unique (user_id, starts_on),
  constraint nutrition_targets_some check (
    kcal is not null or protein_g is not null or carbs_g is not null
    or fat_g is not null or water_ml is not null
  ),
  constraint nutrition_targets_ranges check (
    (kcal is null or (kcal >= 0 and kcal < 20000))
    and (protein_g is null or (protein_g >= 0 and protein_g < 2000))
    and (carbs_g is null or (carbs_g >= 0 and carbs_g < 2000))
    and (fat_g is null or (fat_g >= 0 and fat_g < 2000))
    and (water_ml is null or (water_ml between 1 and 20000))
  )
);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  prescribed_by text,
  prescribed_on date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diet_plans_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint diet_plans_author_length check (
    prescribed_by is null or char_length(btrim(prescribed_by)) between 1 and 120
  ),
  constraint diet_plans_notes_length check (notes is null or char_length(notes) <= 4000)
);

create table public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  position integer not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diet_meals_position_unique unique (plan_id, position),
  constraint diet_meals_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint diet_meals_position check (position between 0 and 20)
);

create table public.diet_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.diet_meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  label text not null,
  quantity numeric(8, 2),
  unit public.food_unit,
  position integer not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diet_items_position_unique unique (meal_id, position),
  constraint diet_items_label_length check (char_length(btrim(label)) between 1 and 120),
  constraint diet_items_quantity check (quantity is null or (quantity > 0 and quantity <= 10000)),
  constraint diet_items_unit check ((quantity is null) = (unit is null)),
  constraint diet_items_position check (position between 0 and 40)
);

create table public.food_substitutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  diet_item_id uuid not null references public.diet_items (id) on delete cascade,
  suggested_food_id uuid not null references public.foods (id) on delete restrict,
  suggested_quantity numeric(8, 2) not null,
  original_kcal numeric(8, 2),
  original_protein_g numeric(8, 2),
  original_carbs_g numeric(8, 2),
  original_fat_g numeric(8, 2),
  suggested_kcal numeric(8, 2) not null,
  suggested_protein_g numeric(8, 2) not null,
  suggested_carbs_g numeric(8, 2) not null,
  suggested_fat_g numeric(8, 2) not null,
  status public.substitution_status not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_substitutions_quantity check (suggested_quantity > 0 and suggested_quantity <= 10000),
  constraint food_substitutions_decision check (
    (status = 'pending' and decided_at is null)
    or (status in ('accepted', 'rejected') and decided_at is not null)
  )
);

comment on table public.food_substitutions is
  'Sugestão de troca. Aceitar ou recusar só muda esta linha; diet_items permanece o plano original.';

