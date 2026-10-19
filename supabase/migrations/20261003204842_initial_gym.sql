-- Single gym. All commercial writes go through checked, atomic RPCs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.staff (
  id uuid primary key references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  role text not null check (role in ('owner','monitor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create function private.staff_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.staff where id = (select auth.uid()) and active;
$$;
revoke all on function private.staff_role() from public, anon;
grant execute on function private.staff_role() to authenticated;

create table public.gym_settings (
  id boolean primary key default true check(id),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  time_zone text not null,
  updated_at timestamptz not null default now()
);
-- Settings are deliberately unseeded: the owner confirms currency/time zone on setup.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 2 and 100),
  description text not null default '' check(length(description) <= 500),
  price_cents integer not null check(price_cents between 1 and 100000000),
  offer_price_cents integer check(offer_price_cents > 0 and offer_price_cents < price_cents),
  offer_label text not null default '' check(length(offer_label) <= 100),
  duration_count integer not null check(duration_count between 1 and 365),
  duration_unit text not null check(duration_unit in ('months','days')),
  active boolean not null default true,
  revision integer not null default 1,
  created_by uuid not null default auth.uid() references public.staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(duration_unit <> 'months' or duration_count <= 24),
  check(offer_price_cents is null or length(trim(offer_label)) > 0)
);
create index activities_created_by_idx on public.activities(created_by);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 2 and 120),
  phone text not null default '' check(length(phone) <= 40),
  email text not null default '' check(length(email) <= 254),
  notes text not null default '' check(length(notes) <= 500),
  revision integer not null default 1,
  created_by uuid not null default auth.uid() references public.staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_name_id_idx on public.customers(lower(name),id);
create index customers_created_by_idx on public.customers(created_by);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  activity_id uuid not null references public.activities(id) on delete restrict,
  activity_name text not null,
  activity_description text not null,
  offer_label text not null default '',
  total_cents integer not null check(total_cents between 1 and 100000000),
  currency text not null,
  starts_on date not null,
  ends_on date not null check(ends_on > starts_on),
  duration_count integer not null,
  duration_unit text not null,
  request_id uuid not null unique,
  request_fingerprint text not null,
  created_by uuid not null references public.staff(id),
  created_at timestamptz not null default now()
);
create index subscriptions_customer_date_idx on public.subscriptions(customer_id, ends_on desc);
create index subscriptions_activity_idx on public.subscriptions(activity_id);
create index subscriptions_created_by_idx on public.subscriptions(created_by);
create table public.payment_batches (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  request_id uuid not null unique,
  created_by uuid not null references public.staff(id),
  created_at timestamptz not null default now()
);
create index payment_batches_subscription_idx on public.payment_batches(subscription_id);
create index payment_batches_created_by_idx on public.payment_batches(created_by);
create table public.payment_entries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.payment_batches(id) on delete restrict,
  method text not null check(method in ('cash','transfer','mercado_pago')),
  amount_cents integer not null check(amount_cents between 1 and 100000000),
  unique(batch_id,method)
);

alter table public.staff enable row level security;
alter table public.gym_settings enable row level security;
alter table public.activities enable row level security;
alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_batches enable row level security;
alter table public.payment_entries enable row level security;
revoke all on public.staff, public.gym_settings, public.activities, public.customers, public.subscriptions, public.payment_batches, public.payment_entries from anon, authenticated;
grant select on public.staff, public.gym_settings, public.activities, public.customers, public.subscriptions, public.payment_batches, public.payment_entries to authenticated;
create policy staff_read on public.staff for select to authenticated using ((select private.staff_role()) is not null);
create policy settings_read on public.gym_settings for select to authenticated using ((select private.staff_role()) is not null);
create policy activities_read on public.activities for select to authenticated using ((select private.staff_role()) is not null);
create policy customers_read on public.customers for select to authenticated using ((select private.staff_role()) is not null);
create policy subscriptions_read on public.subscriptions for select to authenticated using ((select private.staff_role()) is not null);
create policy batches_read on public.payment_batches for select to authenticated using ((select private.staff_role()) is not null);
create policy entries_read on public.payment_entries for select to authenticated using ((select private.staff_role()) is not null);

create function public.configure_gym(p_currency text, p_time_zone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.gym_settings where id=true for update;
  if p_currency not in ('ARS','USD','EUR','UYU','CLP','MXN','COP','PEN','BRL') or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then raise exception 'INVALID_SETTINGS'; end if;
  -- Currency changes after billing need an explicit migration/conversion workflow.
  if exists(select 1 from public.subscriptions) and exists(select 1 from public.gym_settings where currency<>p_currency) then raise exception 'CURRENCY_LOCKED'; end if;
  insert into public.gym_settings(id,currency,time_zone) values(true,p_currency,p_time_zone)
  on conflict(id) do update set currency=excluded.currency,time_zone=excluded.time_zone,updated_at=now();
end $$;

create function public.save_activity(p_id uuid, p_revision integer, p_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
  if p_id is null then
    insert into public.activities(name,description,price_cents,offer_price_cents,offer_label,duration_count,duration_unit,active,created_by)
    values(trim(p_data->>'name'),coalesce(p_data->>'description',''),(p_data->>'price_cents')::integer,(p_data->>'offer_price_cents')::integer,coalesce(p_data->>'offer_label',''),(p_data->>'duration_count')::integer,p_data->>'duration_unit',(p_data->>'active')::boolean,auth.uid()) returning id into result;
  else
    update public.activities set name=trim(p_data->>'name'),description=coalesce(p_data->>'description',''),price_cents=(p_data->>'price_cents')::integer,offer_price_cents=(p_data->>'offer_price_cents')::integer,offer_label=coalesce(p_data->>'offer_label',''),duration_count=(p_data->>'duration_count')::integer,duration_unit=p_data->>'duration_unit',active=(p_data->>'active')::boolean,revision=revision+1,updated_at=now()
    where id=p_id and revision=p_revision returning id into result;
    if result is null then raise exception 'STALE_ACTIVITY'; end if;
  end if;
  return result;
end $$;

create function private.apply_payment(p_subscription uuid,p_request uuid,p_entries jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare sub public.subscriptions; existing public.payment_batches; payment_id uuid; paid bigint; incoming bigint; canonical jsonb; old_entries jsonb;
begin
  if p_request is null or jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries) not between 1 and 3 then raise exception 'INVALID_PAYMENT'; end if;
  select * into sub from public.subscriptions where id=p_subscription for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select jsonb_agg(jsonb_build_object('method',x->>'method','amount',(x->>'amount')::integer) order by x->>'method'),sum((x->>'amount')::integer) into canonical,incoming from jsonb_array_elements(p_entries) x;
  if exists(select 1 from jsonb_array_elements(p_entries) x where x->>'method' is null or x->>'method' not in ('cash','transfer','mercado_pago') or x->>'amount' is null or (x->>'amount') !~ '^[0-9]+$' or (x->>'amount')::integer not between 1 and 100000000) or (select count(distinct x->>'method') from jsonb_array_elements(p_entries) x)<>jsonb_array_length(p_entries) then raise exception 'INVALID_PAYMENT'; end if;
  select * into existing from public.payment_batches where request_id=p_request;
  if found then
    select jsonb_agg(jsonb_build_object('method',method,'amount',amount_cents) order by method) into old_entries from public.payment_entries where batch_id=existing.id;
    if existing.subscription_id<>p_subscription or existing.created_by<>auth.uid() or old_entries<>canonical then raise exception 'REQUEST_CONFLICT'; end if;
    return existing.id;
  end if;
  select coalesce(sum(e.amount_cents),0) into paid from public.payment_entries e join public.payment_batches b on b.id=e.batch_id where b.subscription_id=p_subscription;
  if incoming is null or incoming<=0 or paid+incoming>sub.total_cents then raise exception 'OVERPAYMENT'; end if;
  insert into public.payment_batches(subscription_id,request_id,created_by) values(p_subscription,p_request,auth.uid()) returning id into payment_id;
  insert into public.payment_entries(batch_id,method,amount_cents) select payment_id,x->>'method',(x->>'amount')::integer from jsonb_array_elements(canonical) x;
  return payment_id;
end $$;

create function public.record_payment(p_subscription uuid,p_request uuid,p_entries jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if private.staff_role() is null then raise exception 'FORBIDDEN'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
  return private.apply_payment(p_subscription,p_request,p_entries);
end $$;

create function public.enroll_customer(p_request uuid,p_customer_id uuid,p_customer jsonb,p_activity uuid,p_expected_price integer,p_expected_revision integer,p_expected_start date,p_entries jsonb) returns uuid
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
  return customer;
end $$;

create function public.update_customer(p_id uuid,p_revision integer,p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.staff_role() is null then raise exception 'FORBIDDEN'; end if;
  update public.customers set name=trim(p_data->>'name'),phone=coalesce(p_data->>'phone',''),email=coalesce(p_data->>'email',''),notes=coalesce(p_data->>'notes',''),revision=revision+1,updated_at=now() where id=p_id and revision=p_revision;
  if not found then raise exception 'STALE_CUSTOMER'; end if;
end $$;

create view public.subscription_balances with (security_invoker=true) as
select s.*, coalesce(p.paid_cents,0)::bigint as paid_cents,(s.total_cents-coalesce(p.paid_cents,0))::bigint as balance_cents
from public.subscriptions s left join lateral (
  select sum(e.amount_cents) as paid_cents from public.payment_batches b join public.payment_entries e on e.batch_id=b.id where b.subscription_id=s.id
) p on true;
create view public.customer_overview with (security_invoker=true) as
select c.*,coalesce(b.balance_cents,0)::bigint as balance_cents,b.last_end,b.activity_names,coalesce(b.has_active,false) as has_active
from public.customers c left join lateral (
  select sum(s.balance_cents) as balance_cents,max(s.ends_on) as last_end,string_agg(distinct s.activity_name, ' · ') as activity_names,
  bool_or(s.starts_on <= (now() at time zone g.time_zone)::date and s.ends_on > (now() at time zone g.time_zone)::date) as has_active
  from public.subscription_balances s cross join public.gym_settings g where s.customer_id=c.id
) b on true;
revoke all on public.subscription_balances,public.customer_overview from anon,authenticated;
grant select on public.subscription_balances,public.customer_overview to authenticated;

-- Deny default public execution. Only the intentional entrypoints are callable.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.staff_role() to authenticated;
revoke all on function public.configure_gym(text,text), public.save_activity(uuid,integer,jsonb),public.record_payment(uuid,uuid,jsonb),public.enroll_customer(uuid,uuid,jsonb,uuid,integer,integer,date,jsonb),public.update_customer(uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.configure_gym(text,text), public.save_activity(uuid,integer,jsonb),public.record_payment(uuid,uuid,jsonb),public.enroll_customer(uuid,uuid,jsonb,uuid,integer,integer,date,jsonb),public.update_customer(uuid,integer,jsonb) to authenticated;
-- Provisioning belongs to a server-only admin script, not the application browser.
grant all on public.staff to service_role;
alter publication supabase_realtime add table public.customers,public.activities,public.subscriptions,public.payment_batches;
