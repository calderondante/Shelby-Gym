-- Manual onboarding from paper; preserve historical amounts without fabricating receipts.
alter table public.subscriptions add column opening_sessions_used integer not null default 0
 check(opening_sessions_used>=0 and (opening_sessions_used=0 or (duration_unit='sessions' and import_batch_id is not null and opening_sessions_used<=duration_count)));
create or replace view public.subscription_balances with (security_invoker=true) as
select s.id,s.customer_id,s.activity_id,s.activity_name,s.activity_description,s.offer_label,s.total_cents,s.currency,s.starts_on,s.ends_on,s.duration_count,s.duration_unit,s.request_id,s.request_fingerprint,s.created_by,s.created_at,
 (s.opening_paid_cents+coalesce(p.paid_cents,0))::bigint as paid_cents,
 (s.total_cents-s.opening_paid_cents-coalesce(p.paid_cents,0))::bigint as balance_cents,
 s.opening_paid_cents,s.import_batch_id,
 case when s.duration_unit='sessions' then s.duration_count-s.opening_sessions_used-coalesce(u.used,0)::integer else null end as sessions_remaining,
 s.opening_sessions_used
from public.subscriptions s left join lateral (
 select sum(e.amount_cents) as paid_cents from public.payment_batches b join public.payment_entries e on e.batch_id=b.id where b.subscription_id=s.id
) p on true left join lateral (select sum(e.delta) as used from public.session_events e where e.subscription_id=s.id) u on true;

create table public.paper_enrollments (
 request_id uuid primary key,customer_id uuid not null references public.customers(id),
 subscription_id uuid not null unique references public.subscriptions(id),batch_id uuid not null unique references public.import_batches(id),
 fingerprint text not null,created_by uuid not null references public.staff(id),created_at timestamptz not null default now()
);
create index paper_enrollments_customer_idx on public.paper_enrollments(customer_id);
create index paper_enrollments_actor_idx on public.paper_enrollments(created_by);
alter table public.paper_enrollments enable row level security;
revoke all on public.paper_enrollments from public,anon,authenticated;
grant select on public.paper_enrollments to authenticated;
create policy paper_enrollments_owner on public.paper_enrollments for select to authenticated using((select private.staff_role())='owner');

create function public.register_paper_customer(p_request uuid,p_profile jsonb,p_record jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare config public.gym_settings; activity public.activities; old public.paper_enrollments;
 actor uuid:=auth.uid(); today date; starts date; finishes date; total integer; paid integer; used integer;
 fingerprint text; customer uuid; subscription uuid; batch uuid; payment uuid; entry jsonb; item jsonb;
 detailed bigint:=0; amount bigint; payment_total bigint; payment_date date;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 if p_request is null or jsonb_typeof(p_profile) is distinct from 'object' or jsonb_typeof(p_record) is distinct from 'object' or octet_length(p_profile::text||p_record::text)>40000 then raise exception 'INVALID_PAPER_RECORD';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 fingerprint:=md5(p_profile::text||p_record::text);
 select * into old from public.paper_enrollments where request_id=p_request;
 if found then
  if old.created_by<>actor or old.fingerprint<>fingerprint then raise exception 'REQUEST_CONFLICT';end if;
  return old.customer_id;
 end if;
 select * into config from public.gym_settings where id for share;
 if not found then raise exception 'SETUP_REQUIRED';end if;
 today:=(now() at time zone config.time_zone)::date;
 if config.currency is distinct from p_record->>'currency' then raise exception 'IMPORT_CURRENCY_CHANGED';end if;
 if coalesce(length(trim(p_profile->>'name')),0) not between 2 and 120
 or length(coalesce(p_profile->>'phone',''))>40 or length(coalesce(p_profile->>'email',''))>254 or length(coalesce(p_profile->>'notes',''))>500
 or (coalesce(p_profile->>'email','')<>'' and p_profile->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
 or (coalesce(p_profile->>'instagram','')<>'' and p_profile->>'instagram' !~ '^@[A-Za-z0-9_.]{1,30}$')
 or coalesce(p_profile->>'birthMonth','0') !~ '^([0-9]|1[012])$' then raise exception 'INVALID_PAPER_RECORD';end if;
 if coalesce(p_record->>'totalCents','') !~ '^[0-9]+$' or coalesce(p_record->>'paidCents','') !~ '^[0-9]+$'
 or coalesce(p_record->>'usedClasses','') !~ '^[0-9]+$' or coalesce(p_record->>'startsOn','') !~ '^\d{4}-\d{2}-\d{2}$'
 then raise exception 'INVALID_PAPER_RECORD';end if;
 total:=(p_record->>'totalCents')::integer;paid:=(p_record->>'paidCents')::integer;used:=(p_record->>'usedClasses')::integer;starts:=(p_record->>'startsOn')::date;
 if total not between 1 and 100000000 or paid not between 0 and total or starts<'1900-01-01'::date or starts>today then raise exception 'INVALID_PAPER_RECORD';end if;
 select * into activity from public.activities where id=(p_record->>'activityId')::uuid for share;
 if not found then raise exception 'ACTIVITY_UNAVAILABLE';end if;
 if activity.revision is distinct from (p_record->>'activityRevision')::integer then raise exception 'PRICE_CHANGED';end if;
 if activity.duration_unit='sessions' then
  if nullif(p_record->>'endsOn','') is not null or used not between 0 and activity.duration_count then raise exception 'INVALID_PAPER_RECORD';end if;
  finishes:=null;
 else
  if coalesce(p_record->>'endsOn','') !~ '^\d{4}-\d{2}-\d{2}$' or used<>0 then raise exception 'INVALID_PAPER_RECORD';end if;
  finishes:=(p_record->>'endsOn')::date;
  if finishes<=starts or finishes>'2200-12-31'::date then raise exception 'INVALID_PAPER_RECORD';end if;
 end if;
 if jsonb_typeof(p_record->'payments') is distinct from 'array' or jsonb_array_length(p_record->'payments')>20 then raise exception 'INVALID_PAPER_RECORD';end if;
 for item in select value from jsonb_array_elements(p_record->'payments') loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
  or jsonb_typeof(item->'entries') is distinct from 'array' then raise exception 'INVALID_PAYMENT';end if;
  payment_date:=(item->>'date')::date;
  if payment_date<'1900-01-01'::date or payment_date>today or jsonb_array_length(item->'entries') not between 1 and 3 then raise exception 'INVALID_PAYMENT';end if;
  if (select count(distinct e->>'method') from jsonb_array_elements(item->'entries') e)<>jsonb_array_length(item->'entries') then raise exception 'INVALID_PAYMENT';end if;
  payment_total:=0;
  for entry in select value from jsonb_array_elements(item->'entries') loop
   if coalesce(entry->>'method','') not in ('cash','transfer','mercado_pago') or coalesce(entry->>'amount','') !~ '^[0-9]+$' then raise exception 'INVALID_PAYMENT';end if;
   amount:=(entry->>'amount')::bigint;
   if amount not between 1 and 100000000 then raise exception 'INVALID_PAYMENT';end if;
   payment_total:=payment_total+amount;
  end loop;
  detailed:=detailed+payment_total;
 end loop;
 if detailed>paid then raise exception 'HISTORICAL_PAYMENTS_EXCEED_PAID';end if;
 insert into public.import_batches(source,request_id,fingerprint,result,created_by)
 values('registro manual desde papel',p_request,fingerprint,jsonb_build_object('created',1,'skipped',0,'periods',1,'payments',jsonb_array_length(p_record->'payments'),'committed',true,'issues','[]'::jsonb),actor) returning id into batch;
 insert into public.customers(name,phone,email,notes,birth_month,instagram,marketing_opt_in,instagram_marketing_opt_in,created_by)
 values(trim(p_profile->>'name'),coalesce(p_profile->>'phone',''),coalesce(p_profile->>'email',''),coalesce(p_profile->>'notes',''),nullif((p_profile->>'birthMonth')::smallint,0),coalesce(p_profile->>'instagram',''),coalesce((p_profile->>'marketingOptIn')::boolean,false),coalesce((p_profile->>'instagramMarketingOptIn')::boolean,false),actor) returning id into customer;
 insert into public.subscriptions(customer_id,activity_id,activity_name,activity_description,total_cents,currency,starts_on,ends_on,duration_count,duration_unit,request_id,request_fingerprint,created_by,opening_paid_cents,import_batch_id,opening_sessions_used)
 values(customer,activity.id,activity.name,activity.description,total,config.currency,starts,finishes,case when activity.duration_unit='sessions' then activity.duration_count else finishes-starts end,case when activity.duration_unit='sessions' then 'sessions' else 'days' end,p_request,fingerprint,actor,paid-detailed,batch,used) returning id into subscription;
 for item in select value from jsonb_array_elements(p_record->'payments') loop
  insert into public.payment_batches(subscription_id,request_id,created_by,occurred_on,import_batch_id)
  values(subscription,gen_random_uuid(),actor,(item->>'date')::date,batch) returning id into payment;
  for entry in select value from jsonb_array_elements(item->'entries') loop
   insert into public.payment_entries(batch_id,method,amount_cents) values(payment,entry->>'method',(entry->>'amount')::integer);
  end loop;
 end loop;
 insert into public.paper_enrollments(request_id,customer_id,subscription_id,batch_id,fingerprint,created_by) values(p_request,customer,subscription,batch,fingerprint,actor);
 return customer;
end $$;
revoke all on function public.register_paper_customer(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.register_paper_customer(uuid,jsonb,jsonb) to authenticated;
