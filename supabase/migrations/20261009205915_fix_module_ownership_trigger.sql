-- PL/pgSQL does not short-circuit AND. The ownership trigger was reading
-- columns such as plan_item_id on tables that do not have them.

create or replace function private.enforce_module_ownership()
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
  elsif tg_table_name = 'reading_logs' then
    if new.plan_item_id is not null then
      select item.user_id into owner
      from public.reading_plan_items as item
      where item.id = new.plan_item_id;
      if owner is distinct from new.user_id then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
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
  elsif tg_table_name = 'study_week_goals' then
    if new.subject_id is not null then
      select subject.user_id into owner
      from public.study_subjects as subject
      where subject.id = new.subject_id;
      if owner is distinct from new.user_id then
        raise exception 'invalid_owner' using errcode = '23514';
      end if;
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

  if tg_table_name in ('devotional_entries', 'workout_sessions', 'study_sessions') then
    if new.task_id is not null then
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
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_module_ownership() from public, anon, authenticated;
grant execute on function private.enforce_module_ownership() to authenticated;
