-- Preserve the civil date of existing receipts and financial closures.
create or replace function public.configure_gym(p_currency text, p_time_zone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.gym_settings where id=true for update;
  if p_currency not in ('ARS','USD','EUR','UYU','CLP','MXN','COP','PEN','BRL') or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then raise exception 'INVALID_SETTINGS'; end if;
  -- Currency changes after billing need an explicit migration/conversion workflow.
  if (exists(select 1 from public.subscriptions) or exists(select 1 from public.expenses)) and exists(select 1 from public.gym_settings where currency<>p_currency) then raise exception 'CURRENCY_LOCKED'; end if;
  if (exists(select 1 from public.subscriptions) or exists(select 1 from public.expenses)) and exists(select 1 from public.gym_settings where time_zone<>p_time_zone) then raise exception 'TIME_ZONE_LOCKED'; end if;
  insert into public.gym_settings(id,currency,time_zone) values(true,p_currency,p_time_zone)
  on conflict(id) do update set currency=excluded.currency,time_zone=excluded.time_zone,updated_at=now();
end $$;
