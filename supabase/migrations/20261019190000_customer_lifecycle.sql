-- Reversible lifecycle. An expired subscription never deletes a customer or creates a new charge.
alter table public.customers
  add column status text not null default 'active' check (status in ('active','inactive','retired')),
  add column status_changed_at timestamptz not null default now();
create index customers_status_name_idx on public.customers(status, lower(name), id);

create table public.customer_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  event text not null check (event in ('inactive','retired','reactivated')),
  created_by uuid not null references public.staff(id),
  created_at timestamptz not null default now()
);
create index customer_events_customer_date_idx on public.customer_events(customer_id, created_at desc);
alter table public.customer_events enable row level security;
revoke all on public.customer_events from public, anon, authenticated;
grant select on public.customer_events to authenticated;
create policy customer_events_read on public.customer_events for select to authenticated
  using ((select private.staff_role()) is not null);

create function public.change_customer_status(p_id uuid, p_revision integer, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_customer public.customers; role_name text;
begin
  role_name := private.staff_role();
  if role_name is null then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('active','inactive','retired') then raise exception 'INVALID_STATUS'; end if;
  if p_status = 'retired' and role_name <> 'owner' then raise exception 'FORBIDDEN'; end if;
  select * into current_customer from public.customers where id=p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if current_customer.revision <> p_revision then raise exception 'STALE_CUSTOMER'; end if;
  if current_customer.status = p_status then return; end if;
  update public.customers set status=p_status,status_changed_at=now(),revision=revision+1,updated_at=now() where id=p_id;
  insert into public.customer_events(customer_id,event,created_by)
  values(p_id,case when p_status='active' then 'reactivated' else p_status end,actor);
end $$;
revoke all on function public.change_customer_status(uuid,integer,text) from public, anon, authenticated;
grant execute on function public.change_customer_status(uuid,integer,text) to authenticated;

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
    insert into public.customers(name,phone,email,notes,created_by) values(trim(p_customer->>'name'),coalesce(p_customer->>'phone',''),coalesce(p_customer->>'email',''),coalesce(p_customer->>'notes',''),actor) returning id into customer;
  else
    select id into customer from public.customers where id=p_customer_id for update;
    if customer is null then raise exception 'NOT_FOUND'; end if;
    -- Do not invent advance-renewal/grace rules: a matching current plan must expire first.
    if exists(select 1 from public.subscriptions where customer_id=customer and activity_id=p_activity and ends_on>begins) then raise exception 'ALREADY_ACTIVE'; end if;
  end if;
  insert into public.subscriptions(customer_id,activity_id,activity_name,activity_description,offer_label,total_cents,currency,starts_on,ends_on,duration_count,duration_unit,request_id,request_fingerprint,created_by)
  values(customer,activity.id,activity.name,activity.description,case when activity.offer_price_cents is not null then activity.offer_label else '' end,price,config.currency,begins,finishes,activity.duration_count,activity.duration_unit,p_request,fingerprint,actor) returning id into subscription;
  perform private.apply_payment(subscription,p_request,p_entries);
  if p_customer_id is not null then
    update public.customers set status='active',status_changed_at=now(),revision=revision+1,updated_at=now() where id=customer and status<>'active';
    if found then
      insert into public.customer_events(customer_id,event,created_by) values(customer,'reactivated',actor);
    end if;
  end if;
  return customer;
end $$;

create or replace view public.customer_overview with (security_invoker=true) as
select c.id,c.name,c.phone,c.email,c.notes,c.revision,c.created_by,c.created_at,c.updated_at,
  coalesce(b.balance_cents,0)::bigint as balance_cents,b.last_end,b.activity_names,
  coalesce(b.has_active,false) as has_active,c.status,c.status_changed_at
from public.customers c left join lateral (
  select sum(s.balance_cents) as balance_cents,max(s.ends_on) as last_end,
    string_agg(distinct s.activity_name, ' · ') as activity_names,
    bool_or(s.starts_on <= (now() at time zone g.time_zone)::date and s.ends_on > (now() at time zone g.time_zone)::date) as has_active
  from public.subscription_balances s cross join public.gym_settings g where s.customer_id=c.id
) b on true;
