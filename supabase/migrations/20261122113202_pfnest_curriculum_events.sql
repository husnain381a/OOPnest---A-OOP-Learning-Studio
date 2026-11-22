-- PF uses the existing school profiles and its own course records.
alter table public.profiles add column pfn_roll text, add column pfn_section text;
alter table public.profiles add constraint pfn_student_seat check (
  (pfn_roll is null and pfn_section is null) or
  (pfn_roll is not null and pfn_roll ~ '^[A-Z0-9][A-Z0-9-]{1,31}$' and pfn_section is not null and pfn_section in ('blue', 'gray'))
);
create unique index pfn_student_seat_idx on public.profiles (pfn_section, pfn_roll) where pfn_roll is not null;

create or replace function oopnest_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  student_roll text := upper(new.raw_user_meta_data->>'pfn_roll');
  student_section text := new.raw_user_meta_data->>'pfn_section';
  student_name text := left(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Learner'), 120);
begin
  if lower(coalesce(new.email, '')) like '%@students.pfnest.example' then
    if student_roll is null or student_roll !~ '^[A-Z0-9][A-Z0-9-]{1,31}$'
      or student_section is null or student_section not in ('blue', 'gray')
      or lower(new.email) <> student_section || '.' || lower(student_roll) || '@students.pfnest.example'
      or char_length(btrim(student_name)) < 2 then
      raise exception 'PF student identity is incomplete';
    end if;
  else
    student_roll := null;
    student_section := null;
  end if;
  insert into public.profiles (id, display_name, pfn_roll, pfn_section)
  values (new.id, student_name, student_roll, student_section);
  return new;
end;
$$;

-- Auth sets admin-supplied metadata and confirmation after inserting the user.
-- Check the final row at commit, when a public signup still lacks the teacher flag.
create function oopnest_private.pfn_finish_teacher_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users where id = new.id
    and raw_app_meta_data->>'pfn_teacher' = 'true' and email_confirmed_at is not null) then
    raise exception 'The PF teacher account is provisioned separately';
  end if;
  update public.profiles set role = 'admin' where id = new.id;
  return null;
end;
$$;
revoke all on function oopnest_private.pfn_finish_teacher_signup() from public, anon, authenticated;
create constraint trigger pfn_finish_teacher_signup after insert on auth.users
  deferrable initially deferred for each row when (lower(new.email) = 'aimenansari008@gmail.com')
  execute function oopnest_private.pfn_finish_teacher_signup();

create function oopnest_private.pfn_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = (select auth.uid()) and p.role = 'admin'
      and lower(u.email) = 'aimenansari008@gmail.com' and u.email_confirmed_at is not null
      and u.raw_app_meta_data->>'pfn_teacher' = 'true'
  );
$$;
revoke all on function oopnest_private.pfn_teacher() from public, anon, authenticated;
grant execute on function oopnest_private.pfn_teacher() to authenticated;

drop policy "Student sees own profile, admins see directory" on public.profiles;
create policy pfn_profiles_read on public.profiles for select to authenticated using (
  id = (select auth.uid()) or (select oopnest_private.pfn_teacher())
  or (pfn_roll is null and (select oopnest_private.is_admin()))
);

create table public.pfn_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  lesson_id text not null,
  module smallint not null check (module between 1 and 3),
  stage text not null,
  type text not null check (type in ('check', 'hint')),
  ok boolean not null,
  points smallint not null check (points between -2 and 20),
  topic text not null,
  message text not null,
  answer jsonb,
  lesson_complete boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_id, request_id)
);
create index pfn_events_by_lesson on public.pfn_events (user_id, lesson_id, stage);
create unique index pfn_one_pass_per_stage on public.pfn_events (user_id, lesson_id, stage) where type = 'check' and ok;
create index pfn_failed_topics on public.pfn_events (stage, topic, user_id) where type = 'check' and not ok;
alter table public.pfn_events enable row level security;
revoke all on public.pfn_events from anon, authenticated;
grant select on public.pfn_events to authenticated, service_role;
create policy pfn_events_read on public.pfn_events for select to authenticated
  using (user_id = (select auth.uid()));

create table public.pfn_settings (
  id boolean primary key default true check (id),
  leaderboard_visible boolean not null default true
);
insert into public.pfn_settings default values;
alter table public.pfn_settings enable row level security;
revoke all on public.pfn_settings from anon, authenticated;
grant select on public.pfn_settings to authenticated;
grant update (leaderboard_visible) on public.pfn_settings to authenticated;
create policy pfn_settings_read on public.pfn_settings for select to authenticated using (true);
create policy pfn_settings_write on public.pfn_settings for update to authenticated
  using ((select oopnest_private.pfn_teacher())) with check ((select oopnest_private.pfn_teacher()));

-- Only the Edge Function can submit grades. A per-student transaction lock serializes
-- hints, predictions and completion, including across tabs or retries.
create function public.pfn_record(
  student uuid, request uuid, lesson text, module_number smallint, checkpoint text, action_type text,
  correct boolean, award smallint, issue text, feedback text, response jsonb,
  previous_lesson text, previous_stage text, final_stage boolean
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  stored public.pfn_events%rowtype;
  hints_used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('pfn:' || student::text, 0));
  if not exists (select 1 from public.profiles where id = student and pfn_roll is not null and role = 'student') then
    raise exception 'Student account required';
  end if;
  select * into stored from public.pfn_events where user_id = student and request_id = request;
  if found then return to_jsonb(stored) - 'user_id'; end if;

  if previous_lesson is not null and not exists (
    select 1 from public.pfn_events where user_id = student and lesson_id = previous_lesson and lesson_complete
  ) then raise exception 'Finish the previous lesson first'; end if;
  if previous_stage is not null and not exists (
    select 1 from public.pfn_events where user_id = student and lesson_id = lesson and stage = previous_stage and type = 'check' and ok
  ) then raise exception 'Finish the previous activity first'; end if;
  if exists (select 1 from public.pfn_events where user_id = student and lesson_id = lesson and stage = checkpoint and type = 'check' and ok) then
    raise exception 'This activity is already complete. Reload to see your progress';
  end if;

  if action_type = 'hint' then
    if not exists (select 1 from public.pfn_events where user_id = student and lesson_id = lesson and stage = checkpoint and type = 'check') then
      raise exception 'Try the activity before asking for a hint';
    end if;
    select count(*) into hints_used from public.pfn_events where user_id = student and lesson_id = lesson and type = 'hint';
    if hints_used >= 3 then
      raise exception 'You have used all three hints';
    end if;
    feedback := coalesce(response ->> hints_used, feedback);
    correct := false;
    award := -2;
  elsif not correct then
    award := 0;
  elsif checkpoint = 'predict' and exists (
    select 1 from public.pfn_events where user_id = student and lesson_id = lesson and stage = checkpoint and type = 'check'
  ) then
    award := 0;
  end if;

  insert into public.pfn_events (user_id, request_id, lesson_id, module, stage, type, ok, points, topic, message, answer, lesson_complete)
  values (student, request, lesson, module_number, checkpoint, action_type, correct, award, issue, feedback,
    case when correct then response end, correct and final_stage) returning * into stored;
  return to_jsonb(stored) - 'user_id';
end;
$$;
grant select on public.profiles to service_role;
grant insert on public.pfn_events to service_role;
revoke all on function public.pfn_record(uuid, uuid, text, smallint, text, text, boolean, smallint, text, text, jsonb, text, text, boolean) from public, anon, authenticated;
grant execute on function public.pfn_record(uuid, uuid, text, smallint, text, text, boolean, smallint, text, text, jsonb, text, text, boolean) to service_role;

-- Only names and point totals in the caller's section leave this helper.
create function oopnest_private.pfn_leaderboard()
returns table (display_name text, points bigint)
language sql stable security definer set search_path = '' as $$
  select p.display_name, greatest(0, sum(e.points))::bigint as points
  from public.profiles p
  join public.pfn_events e on e.user_id = p.id
  where p.role = 'student' and p.pfn_section = (
    select c.pfn_section from public.profiles c where c.id = (select auth.uid()) and c.role = 'student'
  ) and exists (select 1 from public.pfn_settings where leaderboard_visible)
  group by p.id order by points desc, p.display_name, p.id limit 10;
$$;
revoke all on function oopnest_private.pfn_leaderboard() from public, anon, authenticated;
grant execute on function oopnest_private.pfn_leaderboard() to authenticated;
create function public.pfn_leaderboard() returns table (display_name text, points bigint)
language sql stable security invoker set search_path = '' as $$
  select * from oopnest_private.pfn_leaderboard();
$$;
revoke all on function public.pfn_leaderboard() from public, anon, authenticated;
grant execute on function public.pfn_leaderboard() to authenticated;

create function oopnest_private.pfn_teacher_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select oopnest_private.pfn_teacher()) then raise exception 'Teacher account required'; end if;
  return jsonb_build_object(
    'students', coalesce((select jsonb_agg(to_jsonb(student) order by student.display_name, student.pfn_roll) from (
      select p.id, p.display_name, p.pfn_roll, p.pfn_section,
        greatest(0, coalesce(sum(e.points), 0)) as score,
        jsonb_build_array(greatest(0, coalesce(sum(e.points) filter (where e.module = 1), 0)),
          greatest(0, coalesce(sum(e.points) filter (where e.module = 2), 0)),
          greatest(0, coalesce(sum(e.points) filter (where e.module = 3), 0))) as module_scores,
        count(*) filter (where e.lesson_complete) as completed, max(e.created_at) as last_active
      from public.profiles p left join public.pfn_events e on e.user_id = p.id
      where p.pfn_roll is not null and p.role = 'student' group by p.id
    ) student), '[]'::jsonb),
    'weaknesses', coalesce((select jsonb_agg(to_jsonb(weakness) order by weakness.topic, weakness.section) from (
      with checks as (
        select p.pfn_section as section, e.user_id, e.stage, e.topic, e.ok from public.pfn_events e
        join public.profiles p on p.id = e.user_id where e.type = 'check'
      ), attempts as (
        select section, stage, count(distinct user_id) as total from checks group by section, stage
      ), topics as (
        select distinct stage, topic from checks where not ok
      ), mistakes as (
        select section, stage, topic, count(distinct user_id) as total from checks where not ok group by section, stage, topic
      ), decision_attempts as (
        select p.pfn_section as section, count(distinct e.user_id) as total from public.pfn_events e
        join public.profiles p on p.id = e.user_id
        where e.type = 'check' and e.stage = 'flow' and e.lesson_id in ('lock','canteen','battery','rain','water')
        group by p.pfn_section
      )
      select a.section, t.topic, coalesce(m.total, 0) as students,
        case when t.topic = 'flow-decision' then coalesce(d.total, 0) else a.total end as attempted
      from topics t join attempts a using (stage)
      left join mistakes m on m.stage = t.stage and m.topic = t.topic and m.section = a.section
      left join decision_attempts d on d.section = a.section
    ) weakness), '[]'::jsonb)
  );
end;
$$;
revoke all on function oopnest_private.pfn_teacher_overview() from public, anon, authenticated;
grant execute on function oopnest_private.pfn_teacher_overview() to authenticated;
create function public.pfn_teacher_overview() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select oopnest_private.pfn_teacher_overview();
$$;
revoke all on function public.pfn_teacher_overview() from public, anon, authenticated;
grant execute on function public.pfn_teacher_overview() to authenticated;
