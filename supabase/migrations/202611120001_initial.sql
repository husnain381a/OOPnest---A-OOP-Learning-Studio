-- OOPnest initial schema. Apply with `supabase db push`.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Learner' check (char_length(display_name) <= 120),
 role text not null default 'student' check (role in ('student','admin')),
 created_at timestamptz not null default now()
);
create table public.lesson_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null check (lesson_id in ('classes','constructors','encapsulation','inheritance','polymorphism','abstraction','composition','overloading')),
 completed_at timestamptz not null default now(),
 primary key(user_id,lesson_id)
);
create table public.notes (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null check (lesson_id in ('classes','constructors','encapsulation','inheritance','polymorphism','abstraction','composition','overloading')),
 body text not null default '' check (char_length(body) <= 20000),
 updated_at timestamptz not null default now(),
 primary key(user_id,lesson_id)
);
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles (id,display_name)
 values (new.id,left(coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1),'Learner'),120));
 return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles (id,display_name) select id,left(coalesce(raw_user_meta_data->>'full_name',split_part(email,'@',1),'Learner'),120) from auth.users on conflict do nothing;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.notes enable row level security;
create policy "Student sees own profile, admins see directory" on public.profiles for select to authenticated using (id=(select auth.uid()) or (select public.is_admin()));
-- No client-side insert or update grant on profiles: users cannot promote their role.
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
create policy "Read progress" on public.lesson_progress for select to authenticated using (user_id=(select auth.uid()) or (select public.is_admin()));
create policy "Insert own progress" on public.lesson_progress for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Update own progress" on public.lesson_progress for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "Read own notes" on public.notes for select to authenticated using (user_id=(select auth.uid()));
create policy "Insert own notes" on public.notes for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Update own notes" on public.notes for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
revoke all on public.lesson_progress,public.notes from anon,authenticated;
grant select,insert,update on public.lesson_progress,public.notes to authenticated;
-- Per-user rate limit shared across all Edge Function instances.
create table public.compiler_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_started_at timestamptz not null default now(),
 attempts integer not null default 0
);
alter table public.compiler_usage enable row level security;
revoke all on public.compiler_usage from anon,authenticated;
create or replace function public.claim_compiler_run() returns boolean
language plpgsql security definer set search_path = '' as $$
declare current_attempts integer; uid uuid := (select auth.uid());
begin
 if uid is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into public.compiler_usage(user_id,attempts) values(uid,0) on conflict do nothing;
 update public.compiler_usage set attempts=0,window_started_at=now() where user_id=uid and window_started_at < now()-interval '1 minute';
 select attempts into current_attempts from public.compiler_usage where user_id=uid;
 if current_attempts >= 10 then return false; end if;
 update public.compiler_usage set attempts=attempts+1 where user_id=uid;
 return true;
end;
$$;
revoke all on function public.claim_compiler_run() from public;
grant execute on function public.claim_compiler_run() to authenticated;
-- Promote the chosen educator manually in the Supabase SQL editor:
-- update public.profiles set role='admin' where id='<verified-user-uuid>';
-- Progress tracks learning completion, not proctored examination grades.
