-- Keep privileged helpers outside the schemas exposed by the Data API.
create schema oopnest_private;
revoke all on schema oopnest_private from public, anon, authenticated;
grant usage on schema oopnest_private to authenticated;

-- The trigger and existing policies retain their references to these functions.
alter function public.handle_new_user() set schema oopnest_private;
revoke all on function oopnest_private.handle_new_user() from public, anon, authenticated, service_role;

alter function public.is_admin() set schema oopnest_private;
revoke all on function oopnest_private.is_admin() from public, anon, authenticated, service_role;
grant execute on function oopnest_private.is_admin() to authenticated;

alter function public.claim_compiler_run() set schema oopnest_private;
revoke all on function oopnest_private.claim_compiler_run() from public, anon, authenticated, service_role;
grant execute on function oopnest_private.claim_compiler_run() to authenticated;

-- The Edge Function uses a user JWT to claim a run through this RPC.
create function public.claim_compiler_run() returns boolean
language sql security invoker set search_path = '' as $$
  select oopnest_private.claim_compiler_run();
$$;
revoke all on function public.claim_compiler_run() from public, anon, authenticated, service_role;
grant execute on function public.claim_compiler_run() to authenticated;

create index profiles_student_directory_idx on public.profiles (created_at desc, id) where role = 'student';
