-- Approved expansion: membership or session packs; immutable financial history.
alter table public.activities drop constraint activities_duration_unit_check;
alter table public.activities add constraint activities_duration_unit_check check(duration_unit in ('months','days','sessions'));
alter table public.customers add column instagram text not null default '' check(instagram = '' or instagram ~ '^@[A-Za-z0-9_.]{1,30}$'),
 add column marketing_opt_in boolean not null default false;
alter table public.subscriptions alter column ends_on drop not null;
alter table public.subscriptions add constraint subscription_duration_kind check(
 (duration_unit='sessions' and ends_on is null and duration_count between 1 and 365)
 or (duration_unit in ('months','days') and ends_on is not null and ends_on>starts_on));

create table public.session_events (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.subscriptions(id),
 request_id uuid not null unique,
 delta smallint not null check(delta in (-1,1)),
 reversal_of uuid unique references public.session_events(id),
 reason text not null default '' check(length(reason)<=300),
 debt_acknowledged boolean not null default false,
 occurred_on date not null,
 created_by uuid not null references public.staff(id),
 created_at timestamptz not null default now(),
 check((delta=1 and reversal_of is null) or (delta=-1 and reversal_of is not null and length(trim(reason))>=3))
);
create index session_events_subscription_idx on public.session_events(subscription_id,created_at);
create index session_events_occurred_idx on public.session_events(occurred_on,id);
alter table public.session_events enable row level security;
revoke all on public.session_events from public,anon,authenticated;
grant select on public.session_events to authenticated;
create policy session_events_read on public.session_events for select to authenticated using ((select private.staff_role()) is not null);

create or replace view public.subscription_balances with (security_invoker=true) as
select s.id,s.customer_id,s.activity_id,s.activity_name,s.activity_description,s.offer_label,s.total_cents,s.currency,s.starts_on,s.ends_on,s.duration_count,s.duration_unit,s.request_id,s.request_fingerprint,s.created_by,s.created_at,
 (s.opening_paid_cents+coalesce(p.paid_cents,0))::bigint as paid_cents,
 (s.total_cents-s.opening_paid_cents-coalesce(p.paid_cents,0))::bigint as balance_cents,
 s.opening_paid_cents,s.import_batch_id,
 case when s.duration_unit='sessions' then s.duration_count-coalesce(u.used,0)::integer else null end as sessions_remaining
from public.subscriptions s left join lateral (
 select sum(e.amount_cents) as paid_cents from public.payment_batches b join public.payment_entries e on e.batch_id=b.id where b.subscription_id=s.id
) p on true left join lateral (select sum(e.delta) as used from public.session_events e where e.subscription_id=s.id) u on true;
create or replace view public.customer_overview with (security_invoker=true) as
select c.id,c.name,c.phone,c.email,c.notes,c.revision,c.created_by,c.created_at,c.updated_at,
 coalesce(b.balance_cents,0)::bigint as balance_cents,b.last_end,b.activity_names,coalesce(b.has_active,false) as has_active,c.status,c.status_changed_at,
 c.instagram,c.marketing_opt_in
from public.customers c left join lateral (
 select sum(s.balance_cents) as balance_cents,max(s.ends_on) as last_end,
 string_agg(distinct s.activity_name,' · ') as activity_names,
 bool_or(s.starts_on <= (now() at time zone g.time_zone)::date and
  (s.ends_on > (now() at time zone g.time_zone)::date or s.sessions_remaining>0)) as has_active
 from public.subscription_balances s cross join public.gym_settings g where s.customer_id=c.id
) b on true;

create or replace function public.update_customer(p_id uuid,p_revision integer,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is null then raise exception 'FORBIDDEN'; end if;
 update public.customers set name=trim(p_data->>'name'),phone=coalesce(p_data->>'phone',''),email=coalesce(p_data->>'email',''),notes=coalesce(p_data->>'notes',''),
 birth_month=nullif(p_data->>'birthMonth','0')::smallint,
 instagram=coalesce(p_data->>'instagram',''),marketing_opt_in=coalesce((p_data->>'marketingOptIn')::boolean,false),
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
  finishes := case when activity.duration_unit='sessions' then null when activity.duration_unit='months' then (begins + make_interval(months=>activity.duration_count))::date else begins+activity.duration_count end;
  if p_customer_id is null then
    insert into public.customers(name,phone,email,notes,birth_month,instagram,marketing_opt_in,created_by)
      values(trim(p_customer->>'name'),coalesce(p_customer->>'phone',''),coalesce(p_customer->>'email',''),coalesce(p_customer->>'notes',''),
        nullif(p_customer->>'birthMonth','0')::smallint,coalesce(p_customer->>'instagram',''),coalesce((p_customer->>'marketingOptIn')::boolean,false),actor)
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

create function public.record_session(p_subscription uuid,p_request uuid,p_acknowledge_debt boolean default false,p_reverse uuid default null,p_reason text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare sub public.subscription_balances; old public.session_events; original public.session_events; result uuid; day date;
begin
 if private.staff_role() is null then raise exception 'FORBIDDEN'; end if;
 if p_request is null then raise exception 'INVALID_REQUEST'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 perform 1 from public.subscriptions where id=p_subscription for update;
 select * into sub from public.subscription_balances where id=p_subscription;
 if not found or sub.duration_unit<>'sessions' then raise exception 'NOT_FOUND'; end if;
 select * into old from public.session_events where request_id=p_request;
 if found then
  if old.subscription_id<>p_subscription or old.created_by<>auth.uid() or old.reversal_of is distinct from p_reverse or old.reason is distinct from p_reason or old.debt_acknowledged<>p_acknowledge_debt then raise exception 'REQUEST_CONFLICT'; end if;
  return old.id;
 end if;
 select (now() at time zone time_zone)::date into day from public.gym_settings where id;
 if p_reverse is null then
  if not exists(select 1 from public.customers where id=sub.customer_id and status='active') then raise exception 'CUSTOMER_INACTIVE'; end if;
  if sub.sessions_remaining<=0 then raise exception 'NO_SESSIONS'; end if;
  if sub.balance_cents>0 and not p_acknowledge_debt then raise exception 'DEBT_CONFIRMATION_REQUIRED'; end if;
 else
  if private.staff_role()<>'owner' then raise exception 'FORBIDDEN'; end if;
  select * into original from public.session_events where id=p_reverse and subscription_id=p_subscription and delta=1;
  if not found or exists(select 1 from public.session_events where reversal_of=p_reverse) or length(trim(p_reason))<3 then raise exception 'INVALID_REVERSAL'; end if;
 end if;
 insert into public.session_events(subscription_id,request_id,delta,reversal_of,reason,debt_acknowledged,occurred_on,created_by)
 values(p_subscription,p_request,case when p_reverse is null then 1 else -1 end,p_reverse,p_reason,p_acknowledge_debt,day,auth.uid()) returning id into result;
 return result;
end $$;
revoke all on function public.record_session(uuid,uuid,boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.record_session(uuid,uuid,boolean,uuid,text) to authenticated;

-- Raffles preserve the actual cutoff and the participant list. Legacy rows stay marked as reconstructed.
alter table public.raffle_draws add column cutoff_at timestamptz,add column snapshot_complete boolean not null default false;
create table public.raffle_entries (
 birth_year integer not null,birth_month smallint not null,
 customer_id uuid not null references public.customers(id),customer_name text not null,
 exclusion_reason text,latest_end date,
 primary key(birth_year,birth_month,customer_id),
 foreign key(birth_year,birth_month) references public.raffle_draws(birth_year,birth_month)
);
alter table public.raffle_entries enable row level security;
revoke all on public.raffle_entries from public,anon,authenticated;
grant select on public.raffle_entries to authenticated;
create policy raffle_entries_read on public.raffle_entries for select to authenticated using ((select private.staff_role()) is not null);
create index raffle_entries_customer_idx on public.raffle_entries(customer_id);
create or replace function public.record_raffle_draw(p_year integer,p_month integer,p_draw_on date) returns void
language plpgsql security definer set search_path='' as $$
declare cut timestamptz; existing public.raffle_draws;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_year is null or p_month is null or p_draw_on is null or p_year not between 2000 and 2100 or p_month not between 1 and 12 or extract(year from p_draw_on)<>p_year or p_draw_on>(now() at time zone 'America/Argentina/Buenos_Aires')::date then raise exception 'INVALID_DRAW_DATE'; end if;
 perform pg_advisory_xact_lock(hashtextextended('raffle-'||p_year||'-'||p_month,0));
 select * into existing from public.raffle_draws where birth_year=p_year and birth_month=p_month;
 if found then
  if existing.draw_on<>p_draw_on then raise exception 'DRAW_ALREADY_RECORDED'; end if;
  return;
 end if;
 cut:=least(now(),((p_draw_on+1)::timestamp at time zone 'America/Argentina/Buenos_Aires')-interval '1 microsecond');
 insert into public.raffle_draws(birth_year,birth_month,draw_on,created_by,cutoff_at,snapshot_complete) values(p_year,p_month,p_draw_on,auth.uid(),cut,true);
 insert into public.raffle_entries(birth_year,birth_month,customer_id,customer_name,exclusion_reason,latest_end)
 select p_year,p_month,c.id,c.name,
 case when c.created_at>cut then 'Alta posterior al sorteo'
 when coalesce((select e.event from public.customer_events e where e.customer_id=c.id and e.created_at<=cut order by e.created_at desc,e.id desc limit 1),'reactivated')<>'reactivated' then 'Perfil de baja o eliminado'
 when s.latest_end is null then 'Sin cuota de socio'
 when s.latest_end<p_draw_on-30 then 'Cuota vencida hace más de 30 días' else null end,s.latest_end
 from public.customers c left join lateral (
  select max(ends_on) as latest_end from public.subscriptions s where s.customer_id=c.id and s.duration_unit<>'sessions' and s.starts_on<=p_draw_on and s.created_at<=cut
 ) s on true where c.birth_month=p_month;
end $$;

-- Expenses: obligations, editable recurrence templates, immutable payment/reversal batches.
create table public.expense_templates (
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title)) between 2 and 100),
 category text not null default 'Servicios' check(length(category) between 1 and 60),amount_cents integer not null check(amount_cents between 1 and 100000000),
 due_day smallint not null check(due_day between 1 and 31),active boolean not null default true,
 revision integer not null default 1,created_by uuid not null references public.staff(id),created_at timestamptz not null default now()
);
create table public.expenses (
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title)) between 2 and 100),category text not null check(length(category) between 1 and 60),
 total_cents integer not null check(total_cents between 1 and 100000000),due_on date not null,
 notes text not null default '' check(length(notes)<=500),template_id uuid references public.expense_templates(id),template_month date,
 request_id uuid not null unique,revision integer not null default 1,created_by uuid not null references public.staff(id),created_at timestamptz not null default now(),
 unique(template_id,template_month),check((template_id is null and template_month is null) or (template_id is not null and template_month=date_trunc('month',due_on)::date))
);
create index expenses_due_idx on public.expenses(due_on,id);
create index expenses_template_idx on public.expenses(template_id);
create table public.expense_payments (
 id uuid primary key default gen_random_uuid(),expense_id uuid not null references public.expenses(id),request_id uuid not null unique,
 amount_cents integer not null check(amount_cents between 1 and 100000000),entries jsonb not null check(jsonb_typeof(entries)='array'),
 reversal_of uuid unique references public.expense_payments(id),reason text not null default '' check(length(reason)<=300),
 occurred_on date not null,created_by uuid not null references public.staff(id),created_at timestamptz not null default now(),
 check(reversal_of is null or length(trim(reason))>=3)
);
create index expense_payments_expense_idx on public.expense_payments(expense_id,occurred_on);
create index expense_payments_date_idx on public.expense_payments(occurred_on,id);
create view public.expense_balances with(security_invoker=true) as
 select e.*,coalesce(p.paid,0)::bigint as paid_cents,(e.total_cents-coalesce(p.paid,0))::bigint as balance_cents
 from public.expenses e left join lateral(select sum(case when reversal_of is null then amount_cents else -amount_cents end) as paid from public.expense_payments p where p.expense_id=e.id) p on true;

create table public.monthly_closings (
 month date primary key check(month=date_trunc('month',month)::date),snapshot jsonb not null,
 created_by uuid not null references public.staff(id),created_at timestamptz not null default now()
);
create table public.campaigns (
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title)) between 2 and 100),
 message text not null check(length(trim(message)) between 5 and 1500),activity_id uuid references public.activities(id),
 status text not null default 'draft' check(status='draft'),created_by uuid not null references public.staff(id),created_at timestamptz not null default now(),request_id uuid not null unique
);
create index campaigns_activity_idx on public.campaigns(activity_id);
create table public.campaign_recipients (
 campaign_id uuid not null references public.campaigns(id),customer_id uuid not null references public.customers(id),
 primary key(campaign_id,customer_id)
);
create index campaign_recipients_customer_idx on public.campaign_recipients(customer_id);
alter table public.expense_templates enable row level security;
revoke all on public.expense_templates from public,anon,authenticated;
grant select on public.expense_templates to authenticated;
create policy expense_templates_read on public.expense_templates for select to authenticated using ((select private.staff_role()) is not null);
alter table public.expenses enable row level security;
revoke all on public.expenses from public,anon,authenticated;
grant select on public.expenses to authenticated;
create policy expenses_read on public.expenses for select to authenticated using ((select private.staff_role()) is not null);
alter table public.expense_payments enable row level security;
revoke all on public.expense_payments from public,anon,authenticated;
grant select on public.expense_payments to authenticated;
create policy expense_payments_read on public.expense_payments for select to authenticated using ((select private.staff_role()) is not null);
alter table public.monthly_closings enable row level security;
revoke all on public.monthly_closings from public,anon,authenticated;
grant select on public.monthly_closings to authenticated;
create policy monthly_closings_read on public.monthly_closings for select to authenticated using ((select private.staff_role()) is not null);
alter table public.campaigns enable row level security;
revoke all on public.campaigns from public,anon,authenticated;
grant select on public.campaigns to authenticated;
create policy campaigns_read on public.campaigns for select to authenticated using ((select private.staff_role()) ='owner');
alter table public.campaign_recipients enable row level security;
revoke all on public.campaign_recipients from public,anon,authenticated;
grant select on public.campaign_recipients to authenticated;
create policy campaign_recipients_read on public.campaign_recipients for select to authenticated using ((select private.staff_role()) ='owner');
revoke all on public.expense_balances from public,anon,authenticated;
grant select on public.expense_balances to authenticated;

create function public.save_expense_template(p_id uuid,p_revision integer,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_id is null then
 insert into public.expense_templates(title,category,amount_cents,due_day,active,created_by)
 values(trim(p_data->>'title'),p_data->>'category',(p_data->>'amount')::integer,(p_data->>'dueDay')::smallint,(p_data->>'active')::boolean,auth.uid()) returning id into result;
 else
 update public.expense_templates set title=trim(p_data->>'title'),category=p_data->>'category',amount_cents=(p_data->>'amount')::integer,due_day=(p_data->>'dueDay')::smallint,active=(p_data->>'active')::boolean,revision=revision+1
 where id=p_id and revision=p_revision returning id into result;
 if result is null then raise exception 'STALE_EXPENSE'; end if;
 end if;
 return result;
end $$;
create function public.generate_monthly_expenses(p_month date) returns integer
language plpgsql security definer set search_path='' as $$
declare n integer; today date;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 select (now() at time zone time_zone)::date into today from public.gym_settings where id;
 if p_month is null or p_month<>date_trunc('month',p_month)::date or p_month<date_trunc('month',today)::date-interval '12 months' or p_month>date_trunc('month',today)::date+interval '12 months' then raise exception 'INVALID_MONTH'; end if;
 if exists(select 1 from public.monthly_closings where month=p_month) then raise exception 'MONTH_CLOSED'; end if;
 insert into public.expenses(title,category,total_cents,due_on,template_id,template_month,request_id,created_by)
 select title,category,amount_cents,p_month+least(due_day,extract(day from (p_month+interval '1 month - 1 day'))::integer)-1,id,p_month,gen_random_uuid(),auth.uid()
 from public.expense_templates where active on conflict(template_id,template_month) do nothing;
 get diagnostics n=row_count;
 return n;
end $$;
create function public.save_expense(p_id uuid,p_revision integer,p_request uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; old public.expense_balances; due date := (p_data->>'dueOn')::date; total integer := (p_data->>'amount')::integer;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_request is null then raise exception 'INVALID_REQUEST'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 if exists(select 1 from public.monthly_closings where month=date_trunc('month',due)::date) then raise exception 'MONTH_CLOSED'; end if;
 if p_id is null then
 select id into result from public.expenses where request_id=p_request and created_by=auth.uid() and title=trim(p_data->>'title') and total_cents=total and due_on=due and category=p_data->>'category' and notes=coalesce(p_data->>'notes','');
 if result is not null then return result; end if;
 insert into public.expenses(title,category,total_cents,due_on,notes,request_id,created_by) values(trim(p_data->>'title'),p_data->>'category',total,due,coalesce(p_data->>'notes',''),p_request,auth.uid()) returning id into result;
 else
 perform 1 from public.expenses where id=p_id for update;
 select * into old from public.expense_balances where id=p_id;
 if not found or old.revision<>p_revision then raise exception 'STALE_EXPENSE'; end if;
 if exists(select 1 from public.monthly_closings where month=date_trunc('month',old.due_on)::date) then raise exception 'MONTH_CLOSED'; end if;
 if total<old.paid_cents then raise exception 'BELOW_PAID'; end if;
 if old.template_id is not null and date_trunc('month',due)::date<>old.template_month then raise exception 'INVALID_MONTH'; end if;
 update public.expenses set title=trim(p_data->>'title'),category=p_data->>'category',total_cents=total,due_on=due,notes=coalesce(p_data->>'notes',''),revision=revision+1 where id=p_id returning id into result;
 end if;
 return result;
end $$;
create function public.pay_expense(p_expense uuid,p_request uuid,p_entries jsonb,p_reverse uuid default null,p_reason text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare sub public.expense_balances; old public.expense_payments; original public.expense_payments; result uuid; total bigint; canonical jsonb; day date;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_request is null then raise exception 'INVALID_REQUEST'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 perform 1 from public.expenses where id=p_expense for update;
 select * into sub from public.expense_balances where id=p_expense;
 if not found then raise exception 'NOT_FOUND'; end if;
 select (now() at time zone time_zone)::date into day from public.gym_settings where id;
 select * into old from public.expense_payments where request_id=p_request;
 if found then
 if old.expense_id<>p_expense or old.created_by<>auth.uid() or old.reversal_of is distinct from p_reverse or old.reason is distinct from p_reason or (p_reverse is null and old.entries<>p_entries) then raise exception 'REQUEST_CONFLICT'; end if;
 return old.id;
 end if;
 if exists(select 1 from public.monthly_closings where month=date_trunc('month',day)::date) then raise exception 'MONTH_CLOSED'; end if;
 if p_reverse is null then
 if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries) not between 1 and 3 then raise exception 'INVALID_PAYMENT'; end if;
 if exists(select 1 from jsonb_array_elements(p_entries) x where x->>'method' is null or x->>'method' not in ('cash','transfer','mercado_pago') or x->>'amount' is null or (x->>'amount') !~ '^[0-9]+$' or (x->>'amount')::bigint not between 1 and 100000000) or (select count(distinct x->>'method') from jsonb_array_elements(p_entries) x)<>jsonb_array_length(p_entries) then raise exception 'INVALID_PAYMENT'; end if;
 select sum((x->>'amount')::integer) into total from jsonb_array_elements(p_entries) x;
 if total<=0 or total>sub.balance_cents then raise exception 'OVERPAYMENT'; end if;
 canonical:=p_entries;
 else
 select * into original from public.expense_payments where id=p_reverse and expense_id=p_expense and reversal_of is null;
 if not found or exists(select 1 from public.expense_payments where reversal_of=p_reverse) or length(trim(p_reason))<3 then raise exception 'INVALID_REVERSAL'; end if;
 total:=original.amount_cents;canonical:=original.entries;
 end if;
 insert into public.expense_payments(expense_id,request_id,amount_cents,entries,reversal_of,reason,occurred_on,created_by)
 values(p_expense,p_request,total,canonical,p_reverse,p_reason,day,auth.uid()) returning id into result;
 return result;
end $$;

-- One SQL statement evaluates each closing consistently; stored snapshots never mutate.
create function public.close_gym_month(p_month date) returns void
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; tz text; day date; next_month date;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 select time_zone into tz from public.gym_settings where id;
 day:=(now() at time zone tz)::date;
 if p_month is null or p_month<>date_trunc('month',p_month)::date or p_month>=date_trunc('month',day)::date then raise exception 'INVALID_MONTH'; end if;
 perform pg_advisory_xact_lock(hashtextextended('month-'||p_month,0));
 if exists(select 1 from public.monthly_closings where month=p_month) then return; end if;
 next_month:=(p_month+interval '1 month')::date;
 with payments as (
 select b.id,coalesce(b.occurred_on,(b.created_at at time zone tz)::date) as day,s.customer_id,c.name,s.activity_name,s.starts_on,
 s.duration_unit,e.method,e.amount_cents from public.payment_batches b join public.payment_entries e on e.batch_id=b.id join public.subscriptions s on s.id=b.subscription_id join public.customers c on c.id=s.customer_id
 ), debts as (
 select s.id,s.customer_id,c.name,s.activity_name,s.starts_on,s.duration_unit,
 greatest(0,s.total_cents-s.opening_paid_cents-coalesce((select sum(e.amount_cents) from public.payment_batches b join public.payment_entries e on e.batch_id=b.id where b.subscription_id=s.id and coalesce(b.occurred_on,(b.created_at at time zone tz)::date)<next_month),0)) as balance_cents
 from public.subscriptions s join public.customers c on c.id=s.customer_id where s.starts_on<next_month
 ), costs as (
 select p.*,e.title from public.expense_payments p join public.expenses e on e.id=p.expense_id where p.occurred_on>=p_month and p.occurred_on<next_month
 )
 select jsonb_build_object('month',p_month,'received',coalesce((select sum(amount_cents) from payments where day>=p_month and day<next_month),0),
 'spent',coalesce((select sum(case when reversal_of is null then amount_cents else -amount_cents end) from costs),0),
 'pendingTotal',coalesce((select sum(balance_cents) from debts),0),
 'pendingMonthly',coalesce((select sum(balance_cents) from debts where starts_on>=p_month),0),
 'pendingMemberships',coalesce((select sum(balance_cents) from debts where starts_on>=p_month and duration_unit<>'sessions'),0),
 'pendingClasses',coalesce((select sum(balance_cents) from debts where starts_on>=p_month and duration_unit='sessions'),0),
 'payments',coalesce((select jsonb_agg(to_jsonb(p)) from payments p where day>=p_month and day<next_month),'[]'::jsonb),
 'expenses',coalesce((select jsonb_agg(to_jsonb(c)) from costs c),'[]'::jsonb),
 'debts',coalesce((select jsonb_agg(to_jsonb(d)) from debts d where balance_cents>0),'[]'::jsonb)) into snapshot;
 insert into public.monthly_closings(month,snapshot,created_by) values(p_month,snapshot,auth.uid());
end $$;
create function public.save_recovery_campaign(p_request uuid,p_title text,p_message text,p_activity uuid,p_customers uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; day date; expected integer;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_request is null or p_customers is null or cardinality(p_customers) not between 1 and 500 then raise exception 'INVALID_RECIPIENTS'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into result from public.campaigns where request_id=p_request;
 if result is not null then
 if not exists(select 1 from public.campaigns where id=result and title=p_title and message=p_message and activity_id is not distinct from p_activity and created_by=auth.uid()) or
 (select array_agg(customer_id order by customer_id) from public.campaign_recipients where campaign_id=result) is distinct from (select array_agg(distinct x order by x) from unnest(p_customers) x) then raise exception 'REQUEST_CONFLICT'; end if;
 return result;
 end if;
 select (now() at time zone time_zone)::date into day from public.gym_settings where id;
 if p_activity is not null and not exists(select 1 from public.activities where id=p_activity and active and duration_unit<>'sessions') then raise exception 'ACTIVITY_UNAVAILABLE'; end if;
 select count(*) into expected from public.customers c
 join lateral (select max(ends_on) as last_end from public.subscriptions s where s.customer_id=c.id and s.duration_unit<>'sessions') s on true
 where c.id=any(p_customers) and c.status<>'retired' and c.marketing_opt_in and length(trim(c.phone))>0 and (s.last_end+interval '2 months')::date<=day;
 if expected<>cardinality(p_customers) then raise exception 'RECIPIENTS_CHANGED'; end if;
 insert into public.campaigns(title,message,activity_id,created_by,request_id) values(trim(p_title),trim(p_message),p_activity,auth.uid(),p_request) returning id into result;
 insert into public.campaign_recipients(campaign_id,customer_id) select result,unnest(p_customers);
 return result;
end $$;
revoke all on function public.save_expense_template(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_expense_template(uuid,integer,jsonb) to authenticated;
revoke all on function public.generate_monthly_expenses(date) from public,anon,authenticated;
grant execute on function public.generate_monthly_expenses(date) to authenticated;
revoke all on function public.save_expense(uuid,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_expense(uuid,integer,uuid,jsonb) to authenticated;
revoke all on function public.pay_expense(uuid,uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.pay_expense(uuid,uuid,jsonb,uuid,text) to authenticated;
revoke all on function public.close_gym_month(date) from public,anon,authenticated;
grant execute on function public.close_gym_month(date) to authenticated;
revoke all on function public.save_recovery_campaign(uuid,text,text,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.save_recovery_campaign(uuid,text,text,uuid,uuid[]) to authenticated;
alter publication supabase_realtime add table public.session_events,public.expenses,public.expense_payments,public.monthly_closings,public.raffle_entries;
