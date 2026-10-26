-- Reject access tokens belonging to sessions explicitly closed after a password change.
-- Supabase Auth can otherwise accept an already-issued JWT until its expiry.
create or replace function private.staff_role() returns text
language sql stable security definer set search_path = '' as $$
  select s.role from public.staff s
  where s.id = (select auth.uid()) and s.active
    and exists (
      select 1 from auth.sessions a
      where a.id = ((select auth.jwt()) ->> 'session_id')::uuid
        and a.user_id = s.id
        and (a.not_after is null or a.not_after > now())
    );
$$;
revoke all on function private.staff_role() from public, anon;
grant execute on function private.staff_role() to authenticated;
