-- A birthday month is enough for the monthly drawing; no birth date is collected.
alter table public.customers
  add column birth_month smallint,
  add constraint customers_birthday_month_valid check (birth_month between 1 and 12);
create index customers_birthday_month_idx on public.customers(birth_month,id)
  where birth_month is not null;

create table public.raffle_draws (
  birth_year integer not null check (birth_year between 2000 and 2100),
  birth_month smallint not null check (birth_month between 1 and 12),
  draw_on date not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.staff(id),
  primary key (birth_year,birth_month),
  constraint raffle_draw_year check (extract(year from draw_on) = birth_year)
);
alter table public.raffle_draws enable row level security;
revoke all on public.raffle_draws from public,anon,authenticated;
grant select on public.raffle_draws to authenticated;
create policy raffle_draws_staff_read on public.raffle_draws for select to authenticated
  using ((select private.staff_role()) is not null);

create function public.record_raffle_draw(p_year integer,p_month integer,p_draw_on date) returns void
language plpgsql security definer set search_path = '' as $$
declare existing date;
begin
  if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
  if p_year not between 2000 and 2100 or p_month not between 1 and 12 or
     extract(year from p_draw_on) <> p_year or p_draw_on > (now() at time zone 'America/Argentina/Buenos_Aires')::date then
    raise exception 'INVALID_DRAW_DATE';
  end if;
  insert into public.raffle_draws(birth_year,birth_month,draw_on,created_by)
    values(p_year,p_month,p_draw_on,auth.uid()) on conflict do nothing;
  select draw_on into existing from public.raffle_draws where birth_year=p_year and birth_month=p_month;
  if existing is distinct from p_draw_on then raise exception 'DRAW_ALREADY_RECORDED'; end if;
end $$;
revoke all on function public.record_raffle_draw(integer,integer,date) from public,anon,authenticated;
grant execute on function public.record_raffle_draw(integer,integer,date) to authenticated;

create or replace function public.update_customer(p_id uuid,p_revision integer,p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.staff_role() is null then raise exception 'FORBIDDEN'; end if;
  update public.customers set name=trim(p_data->>'name'),phone=coalesce(p_data->>'phone',''),email=coalesce(p_data->>'email',''),notes=coalesce(p_data->>'notes',''),
    birth_month=nullif(p_data->>'birthMonth','0')::smallint,
    revision=revision+1,updated_at=now() where id=p_id and revision=p_revision;
  if not found then raise exception 'STALE_CUSTOMER'; end if;
end $$;

create or replace function public.enroll_customer(p_request uuid,p_customer_id uuid,p_customer jsonb,p_activity uuid,p_expected_price integer,p_expected_revision integer,p_expected_start date,p_entries jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); config public.gym_settings; activity public.activities; existing public.subscriptions; customer uuid; subscription uuid; begins date; finishes date; price integer; fingerprint text;
begin
  if private.staff_role() is null then raise exception 'FORBIDDEN'; end if;
  if p_request is null then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
  fingerprint:=md5(coalesce(p_customer_id::text,'')||coalesce(p_customer::text,'')||p_activity::text||p_expected_price::text||p_expected_revision::text||p_expected_start::text||p_entries::text);
  select * into existing from public.subscriptions where request_id=p_request;
  if found then
    if existing.created_by<>actor or existing.request_fingerprint is distinct from fingerprint then raise exception 'REQUEST_CONFLICT'; end if;
    return existing.customer_id;
  end if;
  select * into config from public.gym_settings where id=true for share;
  if not found then raise exception 'SETUP_REQUIRED'; end if;
  select * into activity from public.activities where id=p_activity and active for share;
  if not found then raise exception 'ACTIVITY_UNAVAILABLE'; end if;
  price:=coalesce(activity.offer_price_cents,activity.price_cents);
  if price is distinct from p_expected_price or activity.revision is distinct from p_expected_revision then raise exception 'PRICE_CHANGED'; end if;
  begins := (now() at time zone config.time_zone)::date;
  if begins is distinct from p_expected_start then raise exception 'DATE_CHANGED'; end if;
  finishes := case when activity.duration_unit='months' then (begins + make_interval(months=>activity.duration_count))::date else begins+activity.duration_count end;
  if p_customer_id is null then
    insert into public.customers(name,phone,email,notes,birth_month,created_by)
      values(trim(p_customer->>'name'),coalesce(p_customer->>'phone',''),coalesce(p_customer->>'email',''),coalesce(p_customer->>'notes',''),
        nullif(p_customer->>'birthMonth','0')::smallint,actor)
      returning id into customer;
  else
    select id into customer from public.customers where id=p_customer_id for update;
    if customer is null then raise exception 'NOT_FOUND'; end if;
    if exists(select 1 from public.subscriptions where customer_id=customer and activity_id=p_activity and ends_on>begins) then raise exception 'ALREADY_ACTIVE'; end if;
  end if;
  insert into public.subscriptions(customer_id,activity_id,activity_name,activity_description,offer_label,total_cents,currency,starts_on,ends_on,duration_count,duration_unit,request_id,request_fingerprint,created_by)
    values(customer,activity.id,activity.name,activity.description,case when activity.offer_price_cents is not null then activity.offer_label else '' end,price,config.currency,begins,finishes,activity.duration_count,activity.duration_unit,p_request,fingerprint,actor)
    returning id into subscription;
  perform private.apply_payment(subscription,p_request,p_entries);
  if p_customer_id is not null then
    update public.customers set status='active',status_changed_at=now(),revision=revision+1,updated_at=now() where id=customer and status<>'active';
    if found then insert into public.customer_events(customer_id,event,created_by) values(customer,'reactivated',actor); end if;
  end if;
  return customer;
end $$;
