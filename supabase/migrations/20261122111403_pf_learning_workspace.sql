create function oopnest_private.pf_curriculum()
returns table (lesson_id text, position integer, checkpoints integer)
language sql immutable set search_path = '' as $$
  values ('chai', 1, 4), ('canteen', 2, 4), ('umbrella', 3, 4), ('attendance', 4, 4),
         ('receipt', 5, 5), ('ribbon', 6, 5), ('entry', 7, 5), ('tickets', 8, 5);
$$;
revoke all on function oopnest_private.pf_curriculum() from public, anon, authenticated;
grant execute on function oopnest_private.pf_curriculum() to authenticated;

create table public.pf_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  revision integer not null check (revision > 0),
  step integer not null check (step between 0 and 5),
  first_try jsonb not null check (jsonb_typeof(first_try) = 'object'),
  work jsonb not null check (jsonb_typeof(work) = 'object' and octet_length(work::text) <= 24000),
  primary key (user_id, lesson_id)
);

create index pf_progress_lesson_idx on public.pf_progress (lesson_id);
alter table public.pf_progress enable row level security;
revoke all on public.pf_progress from public, anon, authenticated;
grant select, insert, update on public.pf_progress to authenticated;

create policy "Read own PF work" on public.pf_progress for select to authenticated
  using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy "Create own PF work" on public.pf_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy "Update own PF work" on public.pf_progress for update to authenticated
  using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create function oopnest_private.validate_pf_progress()
returns trigger
language plpgsql set search_path = '' as $$
declare
  lesson_position integer;
  max_steps integer;
  previous_step integer := 0;
  previous_revision integer := 0;
  stages text[] := array['ipo', 'steps', 'chart', 'compare', 'code'];
begin
  select c.position, c.checkpoints into strict lesson_position, max_steps
  from oopnest_private.pf_curriculum() c where c.lesson_id = new.lesson_id;

  if tg_op = 'UPDATE' then
    previous_step := old.step;
    previous_revision := old.revision;
    if new.user_id <> old.user_id or new.lesson_id <> old.lesson_id or not new.first_try @> old.first_try then
      raise exception 'Existing checkpoint history cannot be changed';
    end if;
  elsif exists (
    select 1 from oopnest_private.pf_curriculum() c
    where c.position < lesson_position and not exists (
      select 1 from public.pf_progress p
      where p.user_id = new.user_id and p.lesson_id = c.lesson_id and p.step = c.checkpoints
    )
  ) then
    raise exception 'Finish the previous lessons first';
  end if;

  if previous_step >= max_steps or new.step < previous_step or new.step > previous_step + 1
     or new.revision <> previous_revision + 1 then
    raise exception 'Invalid checkpoint progress';
  end if;
  if not (new.first_try ? stages[previous_step + 1]) or exists (
    select 1 from jsonb_each(new.first_try) as entry(key, value)
    where not (entry.key = any(stages[1:previous_step + 1])) or jsonb_typeof(entry.value) <> 'boolean'
  ) then
    raise exception 'Invalid first attempt history';
  end if;
  return new;
end;
$$;
revoke all on function oopnest_private.validate_pf_progress() from public, anon, authenticated;
create trigger validate_pf_progress before insert or update on public.pf_progress
  for each row execute function oopnest_private.validate_pf_progress();

-- Teachers see reporting data only. Student-written answers stay private.
create function oopnest_private.pf_class_report(page_size integer, page_start integer)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  report jsonb;
begin
  if (select auth.uid()) is null or (select auth.jwt()->>'is_anonymous') = 'true'
     or not (select oopnest_private.is_admin()) then
    raise exception 'Teacher access is required' using errcode = '42501';
  end if;

  with curriculum as (select * from oopnest_private.pf_curriculum()),
  roster as (
    select p.id, p.display_name, p.created_at from public.profiles p
    where p.role = 'student'
    order by p.created_at desc, p.id
    limit least(greatest(page_size, 1), 50) offset greatest(page_start, 0)
  ),
  student_summary as (
    select r.id, r.display_name, r.created_at, coalesce(sum(p.step), 0) as points,
      count(*) filter (where p.step = c.checkpoints) as completed,
      jsonb_agg(jsonb_build_object('id', c.lesson_id, 'points', coalesce(p.step, 0))
        order by c.position) as lessons
    from roster r cross join curriculum c
    left join public.pf_progress p on p.user_id = r.id and p.lesson_id = c.lesson_id
    group by r.id, r.display_name, r.created_at
  ),
  class_work as (
    select p.lesson_id, p.step, p.first_try from public.pf_progress p
    join public.profiles s on s.id = p.user_id and s.role = 'student'
  ),
  topic_summary as (
    select c.lesson_id, c.position,
      count(w.lesson_id) as learners_started,
      count(*) filter (where w.step = c.checkpoints) as learners_finished,
      coalesce(sum(checks.attempted), 0) as first_checks,
      coalesce(sum(checks.correct), 0) as first_correct
    from curriculum c left join class_work w on w.lesson_id = c.lesson_id
    left join lateral (
      select count(*) as attempted, count(*) filter (where value = 'true'::jsonb) as correct
      from jsonb_each(w.first_try)
    ) checks on true
    group by c.lesson_id, c.position
  )
  select jsonb_build_object(
    'total', (select count(*) from public.profiles where role = 'student'),
    'active', (select count(distinct p.user_id) from public.pf_progress p
      join public.profiles s on s.id = p.user_id and s.role = 'student'),
    'students', coalesce((select jsonb_agg(to_jsonb(s) - 'created_at' order by s.created_at desc, s.id)
      from student_summary s), '[]'::jsonb),
    'topics', (select jsonb_agg(to_jsonb(t) - 'position' order by t.position) from topic_summary t)
  ) into report;
  return report;
end;
$$;
revoke all on function oopnest_private.pf_class_report(integer, integer) from public, anon, authenticated;
grant execute on function oopnest_private.pf_class_report(integer, integer) to authenticated;

create function public.pf_class_report(page_size integer, page_start integer)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select oopnest_private.pf_class_report(page_size, page_start);
$$;
revoke all on function public.pf_class_report(integer, integer) from public, anon, authenticated;
grant execute on function public.pf_class_report(integer, integer) to authenticated;
