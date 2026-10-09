-- Fase 2: devocional, treinos e estudos.
-- Depende da migration da Fase 1. Cada linha continua pertencendo a um único usuário.
-- Aceitar uma sugestão de carga não altera a ficha; isso fica para uma confirmação explícita na aplicação.

create type public.prayer_status as enum ('open', 'answered');
create type public.reading_kind as enum ('plan', 'free');
create type public.workout_session_status as enum ('partial', 'completed');
create type public.suggestion_status as enum ('pending', 'accepted', 'dismissed');
create type public.study_kind as enum ('subject', 'course');
create type public.study_session_status as enum ('running', 'completed', 'discarded');

create table public.devotional_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  passage_label text,
  passage_url text,
  reflection text,
  completed_at timestamptz,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devotional_entries_day_unique unique (user_id, entry_date),
  constraint devotional_entries_passage_label_length check (
    passage_label is null or char_length(btrim(passage_label)) between 1 and 160
  ),
  constraint devotional_entries_passage_url_https check (
    passage_url is null or passage_url ~ '^https://'
  ),
  constraint devotional_entries_reflection_length check (
    reflection is null or char_length(reflection) <= 8000
  )
);

create table public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  starts_on date not null,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_plans_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint reading_plans_description_length check (
    description is null or char_length(description) <= 2000
  ),
  constraint reading_plans_date_range check (ends_on is null or ends_on >= starts_on)
);

create table public.reading_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_number integer not null,
  passage_label text not null,
  passage_url text,
  scheduled_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_plan_items_day_unique unique (plan_id, day_number),
  constraint reading_plan_items_day_number check (day_number between 1 and 400),
  constraint reading_plan_items_label_length check (char_length(btrim(passage_label)) between 1 and 160),
  constraint reading_plan_items_url_https check (passage_url is null or passage_url ~ '^https://')
);

create table public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_on date not null,
  kind public.reading_kind not null,
  plan_item_id uuid references public.reading_plan_items (id) on delete set null,
  passage_label text not null,
  passage_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_logs_kind_link check (
    (kind = 'plan' and plan_item_id is not null)
    or (kind = 'free' and plan_item_id is null)
  ),
  constraint reading_logs_label_length check (char_length(btrim(passage_label)) between 1 and 160),
  constraint reading_logs_url_https check (passage_url is null or passage_url ~ '^https://'),
  constraint reading_logs_notes_length check (notes is null or char_length(notes) <= 4000)
);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  details text,
  asked_on date not null,
  status public.prayer_status not null default 'open',
  answer text,
  answered_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_requests_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint prayer_requests_details_length check (details is null or char_length(details) <= 4000),
  constraint prayer_requests_answer_length check (answer is null or char_length(answer) <= 4000),
  constraint prayer_requests_answer_state check (
    (
      status = 'open'
      and answer is null
      and answered_on is null
    )
    or (
      status = 'answered'
      and answer is not null
      and char_length(btrim(answer)) between 1 and 4000
      and answered_on is not null
      and answered_on >= asked_on
    )
  )
);

create table public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gratitude_entries_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create table public.devotional_week_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_starts_on date not null,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devotional_week_goals_monday check (extract(isodow from week_starts_on) = 1),
  constraint devotional_week_goals_title_length check (char_length(btrim(title)) between 1 and 160)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_unique unique (user_id, name),
  constraint exercises_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint exercises_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table public.workout_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sheets_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint workout_sheets_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.workout_sheets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  weekday smallint,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_days_position_unique unique (sheet_id, position),
  constraint workout_days_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint workout_days_weekday check (weekday is null or weekday between 0 and 6),
  constraint workout_days_position check (position between 0 and 13)
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.workout_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null,
  target_sets integer not null,
  target_reps text not null,
  rest_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercises_position_unique unique (day_id, position),
  constraint workout_exercises_position check (position between 0 and 40),
  constraint workout_exercises_sets check (target_sets between 1 and 20),
  constraint workout_exercises_reps_length check (char_length(btrim(target_reps)) between 1 and 40),
  constraint workout_exercises_rest check (rest_seconds is null or rest_seconds between 0 and 3600),
  constraint workout_exercises_notes_length check (notes is null or char_length(notes) <= 1000)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sheet_id uuid references public.workout_sheets (id) on delete set null,
  day_id uuid references public.workout_days (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  performed_on date not null,
  status public.workout_session_status not null default 'partial',
  notes text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint workout_sessions_time_order check (
    started_at is null or ended_at is null or ended_at >= started_at
  )
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_number integer not null,
  reps integer not null,
  load_kg numeric(6, 2) not null default 0,
  completed boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sets_identity_unique unique (session_id, exercise_id, set_number),
  constraint workout_sets_number check (set_number between 1 and 30),
  constraint workout_sets_reps check (reps between 0 and 500 and (completed = false or reps > 0)),
  constraint workout_sets_load check (load_kg >= 0 and load_kg < 1000),
  constraint workout_sets_notes_length check (notes is null or char_length(notes) <= 280)
);

create table public.load_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  based_on_set_id uuid references public.workout_sets (id) on delete set null,
  suggested_load_kg numeric(6, 2) not null,
  note text,
  status public.suggestion_status not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint load_suggestions_load check (suggested_load_kg >= 0 and suggested_load_kg < 1000),
  constraint load_suggestions_note_length check (note is null or char_length(note) <= 280),
  constraint load_suggestions_decision check (
    (status = 'pending' and decided_at is null)
    or (status in ('accepted', 'dismissed') and decided_at is not null)
  )
);

comment on table public.load_suggestions is
  'Sugestão de carga. Aceitar ou recusar só muda o status desta linha; a ficha não é alterada automaticamente.';

create table public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  kind public.study_kind not null default 'subject',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_subjects_name_unique unique (user_id, name),
  constraint study_subjects_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint study_subjects_notes_length check (notes is null or char_length(notes) <= 4000)
);

create table public.study_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  position integer not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_topics_position_unique unique (subject_id, position),
  constraint study_topics_position check (position between 0 and 200),
  constraint study_topics_title_length check (char_length(btrim(title)) between 1 and 160)
);

create table public.study_week_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.study_subjects (id) on delete set null,
  week_starts_on date not null,
  title text not null,
  target_minutes integer,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_week_goals_monday check (extract(isodow from week_starts_on) = 1),
  constraint study_week_goals_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint study_week_goals_minutes check (
    target_minutes is null or target_minutes between 1 and 10080
  )
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  notes text,
  status public.study_session_status not null default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_notes_length check (notes is null or char_length(notes) <= 8000),
  constraint study_sessions_duration check (
    duration_seconds is null or duration_seconds between 0 and 86400
  ),
  constraint study_sessions_status_times check (
    (status = 'running' and ended_at is null and duration_seconds is null)
    or (
      status = 'completed'
      and ended_at is not null
      and duration_seconds is not null
      and ended_at >= started_at
    )
    or (status = 'discarded' and (ended_at is null or ended_at >= started_at))
  )
);

create table public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.study_subjects (id) on delete cascade,
  session_id uuid references public.study_sessions (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_notes_context check (subject_id is not null or session_id is not null),
  constraint study_notes_body_length check (char_length(btrim(body)) between 1 and 8000)
);

create index devotional_entries_user_day_idx on public.devotional_entries (user_id, entry_date);
create index devotional_entries_task_id_idx on public.devotional_entries (task_id);
create index reading_plans_user_idx on public.reading_plans (user_id, starts_on);
create index reading_plan_items_plan_idx on public.reading_plan_items (plan_id, day_number);
create index reading_plan_items_user_idx on public.reading_plan_items (user_id);
create index reading_logs_user_day_idx on public.reading_logs (user_id, read_on);
create index reading_logs_plan_item_idx on public.reading_logs (plan_item_id);
create index prayer_requests_user_day_idx on public.prayer_requests (user_id, asked_on);
create index gratitude_entries_user_day_idx on public.gratitude_entries (user_id, entry_date);
create index devotional_week_goals_user_week_idx on public.devotional_week_goals (user_id, week_starts_on);
create index exercises_user_idx on public.exercises (user_id);
create index workout_sheets_user_idx on public.workout_sheets (user_id);
create index workout_days_sheet_idx on public.workout_days (sheet_id, position);
create index workout_days_user_idx on public.workout_days (user_id);
create index workout_exercises_day_idx on public.workout_exercises (day_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);
create index workout_exercises_user_idx on public.workout_exercises (user_id);
create index workout_sessions_user_day_idx on public.workout_sessions (user_id, performed_on);
create index workout_sessions_sheet_idx on public.workout_sessions (sheet_id);
create index workout_sessions_day_idx on public.workout_sessions (day_id);
create index workout_sessions_task_idx on public.workout_sessions (task_id);
create index workout_sets_session_idx on public.workout_sets (session_id, set_number);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id);
create index load_suggestions_user_exercise_idx on public.load_suggestions (user_id, exercise_id, created_at);
create index load_suggestions_set_idx on public.load_suggestions (based_on_set_id);
create index study_subjects_user_idx on public.study_subjects (user_id);
create index study_topics_subject_idx on public.study_topics (subject_id, position);
create index study_topics_user_idx on public.study_topics (user_id);
create index study_week_goals_user_week_idx on public.study_week_goals (user_id, week_starts_on);
create index study_week_goals_subject_idx on public.study_week_goals (subject_id);
create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at);
create index study_sessions_subject_idx on public.study_sessions (subject_id);
create index study_sessions_task_idx on public.study_sessions (task_id);
create index study_notes_user_idx on public.study_notes (user_id, created_at);
create index study_notes_subject_idx on public.study_notes (subject_id);
create index study_notes_session_idx on public.study_notes (session_id);

create function private.enforce_module_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid;
  parent_sheet uuid;
  parent_subject uuid;
  task_module public.linked_module;
  expected_module public.linked_module;
begin
  if tg_table_name = 'reading_plan_items' then
    select plan.user_id into owner
    from public.reading_plans as plan
    where plan.id = new.plan_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'reading_logs' and new.plan_item_id is not null then
    select item.user_id into owner
    from public.reading_plan_items as item
    where item.id = new.plan_item_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'workout_days' then
    select sheet.user_id into owner
    from public.workout_sheets as sheet
    where sheet.id = new.sheet_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'workout_exercises' then
    select day.user_id, day.sheet_id into owner, parent_sheet
    from public.workout_days as day
    where day.id = new.day_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    select exercise.user_id into owner
    from public.exercises as exercise
    where exercise.id = new.exercise_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'workout_sessions' then
    if new.sheet_id is not null then
      select sheet.user_id into owner
      from public.workout_sheets as sheet
      where sheet.id = new.sheet_id;
      if owner is distinct from new.user_id then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
    end if;
    if new.day_id is not null then
      select day.user_id, day.sheet_id into owner, parent_sheet
      from public.workout_days as day
      where day.id = new.day_id;
      if owner is distinct from new.user_id
        or (new.sheet_id is not null and parent_sheet is distinct from new.sheet_id) then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'workout_sets' then
    select session.user_id into owner
    from public.workout_sessions as session
    where session.id = new.session_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    select exercise.user_id into owner
    from public.exercises as exercise
    where exercise.id = new.exercise_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'load_suggestions' then
    select exercise.user_id into owner
    from public.exercises as exercise
    where exercise.id = new.exercise_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
    if new.based_on_set_id is not null then
      select recorded.user_id into owner
      from public.workout_sets as recorded
      where recorded.id = new.based_on_set_id;
      if owner is distinct from new.user_id then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'study_topics' then
    select subject.user_id into owner
    from public.study_subjects as subject
    where subject.id = new.subject_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'study_week_goals' and new.subject_id is not null then
    select subject.user_id into owner
    from public.study_subjects as subject
    where subject.id = new.subject_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'study_sessions' then
    select subject.user_id into owner
    from public.study_subjects as subject
    where subject.id = new.subject_id;
    if owner is distinct from new.user_id then
      raise exception 'invalid_owner' using errcode = '23514';
    end if;
  elsif tg_table_name = 'study_notes' then
    if new.subject_id is not null then
      select subject.user_id into owner
      from public.study_subjects as subject
      where subject.id = new.subject_id;
      if owner is distinct from new.user_id then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
    end if;
    if new.session_id is not null then
      select session.user_id, session.subject_id into owner, parent_subject
      from public.study_sessions as session
      where session.id = new.session_id;
      if owner is distinct from new.user_id
        or (new.subject_id is not null and parent_subject is distinct from new.subject_id) then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
    end if;
  end if;

  if tg_table_name in ('devotional_entries', 'workout_sessions', 'study_sessions')
    and new.task_id is not null then
    expected_module = case tg_table_name
      when 'devotional_entries' then 'devotional'::public.linked_module
      when 'workout_sessions' then 'workout'::public.linked_module
      else 'study'::public.linked_module
    end;
    select task.user_id, task.linked_module into owner, task_module
    from public.tasks as task
    where task.id = new.task_id;
    if owner is distinct from new.user_id or task_module is distinct from expected_module then
      raise exception 'invalid_task' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_module_ownership() from public;
grant execute on function private.enforce_module_ownership() to authenticated;

create trigger devotional_entries_set_updated_at
  before update on public.devotional_entries
  for each row execute function private.set_updated_at();
create trigger devotional_entries_enforce_owner
  before insert or update on public.devotional_entries
  for each row execute function private.enforce_module_ownership();

create trigger reading_plans_set_updated_at
  before update on public.reading_plans
  for each row execute function private.set_updated_at();

create trigger reading_plan_items_set_updated_at
  before update on public.reading_plan_items
  for each row execute function private.set_updated_at();
create trigger reading_plan_items_enforce_owner
  before insert or update on public.reading_plan_items
  for each row execute function private.enforce_module_ownership();

create trigger reading_logs_set_updated_at
  before update on public.reading_logs
  for each row execute function private.set_updated_at();
create trigger reading_logs_enforce_owner
  before insert or update on public.reading_logs
  for each row execute function private.enforce_module_ownership();

create trigger prayer_requests_set_updated_at
  before update on public.prayer_requests
  for each row execute function private.set_updated_at();

create trigger gratitude_entries_set_updated_at
  before update on public.gratitude_entries
  for each row execute function private.set_updated_at();

create trigger devotional_week_goals_set_updated_at
  before update on public.devotional_week_goals
  for each row execute function private.set_updated_at();

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function private.set_updated_at();

create trigger workout_sheets_set_updated_at
  before update on public.workout_sheets
  for each row execute function private.set_updated_at();

create trigger workout_days_set_updated_at
  before update on public.workout_days
  for each row execute function private.set_updated_at();
create trigger workout_days_enforce_owner
  before insert or update on public.workout_days
  for each row execute function private.enforce_module_ownership();

create trigger workout_exercises_set_updated_at
  before update on public.workout_exercises
  for each row execute function private.set_updated_at();
create trigger workout_exercises_enforce_owner
  before insert or update on public.workout_exercises
  for each row execute function private.enforce_module_ownership();

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function private.set_updated_at();
create trigger workout_sessions_enforce_owner
  before insert or update on public.workout_sessions
  for each row execute function private.enforce_module_ownership();

create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function private.set_updated_at();
create trigger workout_sets_enforce_owner
  before insert or update on public.workout_sets
  for each row execute function private.enforce_module_ownership();

create trigger load_suggestions_set_updated_at
  before update on public.load_suggestions
  for each row execute function private.set_updated_at();
create trigger load_suggestions_enforce_owner
  before insert or update on public.load_suggestions
  for each row execute function private.enforce_module_ownership();

create trigger study_subjects_set_updated_at
  before update on public.study_subjects
  for each row execute function private.set_updated_at();

create trigger study_topics_set_updated_at
  before update on public.study_topics
  for each row execute function private.set_updated_at();
create trigger study_topics_enforce_owner
  before insert or update on public.study_topics
  for each row execute function private.enforce_module_ownership();

create trigger study_week_goals_set_updated_at
  before update on public.study_week_goals
  for each row execute function private.set_updated_at();
create trigger study_week_goals_enforce_owner
  before insert or update on public.study_week_goals
  for each row execute function private.enforce_module_ownership();

create trigger study_sessions_set_updated_at
  before update on public.study_sessions
  for each row execute function private.set_updated_at();
create trigger study_sessions_enforce_owner
  before insert or update on public.study_sessions
  for each row execute function private.enforce_module_ownership();

create trigger study_notes_set_updated_at
  before update on public.study_notes
  for each row execute function private.set_updated_at();
create trigger study_notes_enforce_owner
  before insert or update on public.study_notes
  for each row execute function private.enforce_module_ownership();

do $policies$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'devotional_entries',
    'reading_plans',
    'reading_plan_items',
    'reading_logs',
    'prayer_requests',
    'gratitude_entries',
    'devotional_week_goals',
    'exercises',
    'workout_sheets',
    'workout_days',
    'workout_exercises',
    'workout_sessions',
    'workout_sets',
    'load_suggestions',
    'study_subjects',
    'study_topics',
    'study_week_goals',
    'study_sessions',
    'study_notes'
  ]
  loop
    execute format('alter table public.%I enable row level security', owned_table);
    execute format('revoke all on table public.%I from anon, public', owned_table);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      owned_table
    );
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
