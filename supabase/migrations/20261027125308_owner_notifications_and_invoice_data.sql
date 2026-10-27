-- Invoice images never reach the database. These optional fields hold reviewed text only.
alter table public.expenses add column supplier text not null default '' check(length(supplier)<=160);
alter table public.expenses add column invoice_number text not null default '' check(length(invoice_number)<=80);
create unique index expenses_supplier_invoice_unique on public.expenses(lower(btrim(supplier)),lower(regexp_replace(invoice_number,'[[:space:]]','','g')))
where supplier<>'' and invoice_number<>'';
create or replace view public.expense_balances with(security_invoker=true) as
select e.id,e.title,e.category,e.total_cents,e.due_on,e.notes,e.template_id,e.template_month,e.request_id,e.revision,e.created_by,e.created_at,
 coalesce(p.paid,0) paid_cents,e.total_cents-coalesce(p.paid,0) balance_cents,e.supplier,e.invoice_number
from public.expenses e left join lateral(select sum(case when p.reversal_of is null then p.amount_cents else -p.amount_cents end) paid from public.expense_payments p where p.expense_id=e.id) p on true;
create or replace function public.save_expense(p_id uuid,p_revision integer,p_request uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; old public.expense_balances; due date:=(p_data->>'dueOn')::date; total integer:=(p_data->>'amount')::integer;
 supplier_text text:=btrim(coalesce(p_data->>'supplier','')); number_text text:=btrim(coalesce(p_data->>'invoiceNumber',''));
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 if p_request is null then raise exception 'INVALID_REQUEST';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 if exists(select 1 from public.monthly_closings where month=date_trunc('month',due)::date) then raise exception 'MONTH_CLOSED';end if;
 if p_id is null then
  select id into result from public.expenses where request_id=p_request and created_by=auth.uid() and title=trim(p_data->>'title') and total_cents=total and due_on=due and category=p_data->>'category' and notes=coalesce(p_data->>'notes','') and supplier=supplier_text and invoice_number=number_text;
  if result is not null then return result;end if;
  insert into public.expenses(title,category,total_cents,due_on,notes,request_id,created_by,supplier,invoice_number)
  values(trim(p_data->>'title'),p_data->>'category',total,due,coalesce(p_data->>'notes',''),p_request,auth.uid(),supplier_text,number_text) returning id into result;
 else
  perform 1 from public.expenses where id=p_id for update;
  select * into old from public.expense_balances where id=p_id;
  if not found or old.revision<>p_revision then raise exception 'STALE_EXPENSE';end if;
  if exists(select 1 from public.monthly_closings where month=date_trunc('month',old.due_on)::date) then raise exception 'MONTH_CLOSED';end if;
  if not(p_data?'supplier') then supplier_text:=old.supplier;end if;
  if not(p_data?'invoiceNumber') then number_text:=old.invoice_number;end if;
  if total<old.paid_cents then raise exception 'BELOW_PAID';end if;
  if old.template_id is not null and date_trunc('month',due)::date<>old.template_month then raise exception 'INVALID_MONTH';end if;
  update public.expenses set title=trim(p_data->>'title'),category=p_data->>'category',total_cents=total,due_on=due,notes=coalesce(p_data->>'notes',''),supplier=supplier_text,invoice_number=number_text,revision=revision+1 where id=p_id returning id into result;
 end if;
 return result;
exception when unique_violation then
 if exists(select 1 from public.expenses where lower(btrim(supplier))=lower(supplier_text) and lower(regexp_replace(invoice_number,'[[:space:]]','','g'))=lower(regexp_replace(number_text,'[[:space:]]','','g')) and supplier_text<>'' and number_text<>'') then raise exception 'DUPLICATE_INVOICE';end if;
 raise exception 'REQUEST_CONFLICT';
end $$;

create table public.owner_notification_settings(
 id boolean primary key default true check(id),enabled boolean not null default true,customers_enabled boolean not null default true,expenses_enabled boolean not null default true,
 notify_before boolean not null default true,days_before smallint not null default 3 check(days_before between 1 and 30),notify_on_due boolean not null default true,
 notify_overdue boolean not null default true,overdue_every smallint not null default 1 check(overdue_every between 1 and 30),send_hour smallint not null default 9 check(send_hour between 0 and 23),
 revision integer not null default 1,updated_at timestamptz not null default now()
);
insert into public.owner_notification_settings(id) values(true);
update public.owner_notification_settings s set notify_before=r.notify_before,days_before=r.days_before,notify_on_due=r.notify_on_due,notify_overdue=r.notify_overdue,overdue_every=r.overdue_every,send_hour=r.send_hour from public.communication_rules r where r.kind='expense';
alter table public.owner_notification_settings enable row level security;
revoke all on public.owner_notification_settings from public,anon,authenticated;
grant select on public.owner_notification_settings to authenticated;
create policy owner_notification_settings_read on public.owner_notification_settings for select to authenticated using((select private.staff_role())='owner');

create table public.owner_notification_reads(
 staff_id uuid not null default auth.uid() references public.staff(id),alert_key text not null check(length(alert_key)<=250),read_at timestamptz not null default now(),primary key(staff_id,alert_key)
);
alter table public.owner_notification_reads enable row level security;
revoke all on public.owner_notification_reads from public,anon,authenticated;
grant select,insert,update,delete on public.owner_notification_reads to authenticated;
create policy owner_notification_reads_own on public.owner_notification_reads to authenticated using(staff_id=(select auth.uid()) and (select private.staff_role())='owner') with check(staff_id=(select auth.uid()) and (select private.staff_role())='owner');

create function private.owner_alert_candidates() returns table(alert_key text,kind text,reference_id uuid,title text,due_on date,balance_cents bigint,phase text,href text,push_today boolean)
language sql stable security invoker set search_path='' as $$
 with cfg as(select s.*, (now() at time zone g.time_zone)::date today from public.owner_notification_settings s cross join public.gym_settings g where s.id and g.id),
 items as(
 select 'expense'::text kind,e.id reference_id,e.title,e.due_on,e.balance_cents::bigint balance_cents,'/historial/gastos?mes='||to_char(e.due_on,'YYYY-MM')||'#gasto-'||e.id::text href,cfg.*
 from public.expense_balances e cross join cfg where cfg.expenses_enabled and e.balance_cents>0 and e.due_on<=cfg.today+cfg.days_before
 union all
 select 'customer',c.id,'Cuota de '||c.name,c.last_end,c.balance_cents::bigint,'/clientes/'||c.id::text,cfg.*
 from public.customer_overview c cross join cfg where cfg.customers_enabled and c.status='active' and c.last_end is not null and c.last_end<=cfg.today+cfg.days_before
 ), phased as(select i.*,case when due_on>today then 'soon' when due_on=today then 'today' else 'overdue' end phase from items i)
 select kind||':'||reference_id::text||':'||due_on::text||':'||phase||':'||balance_cents::text,kind,reference_id,title,due_on,balance_cents,phase,href,
 case when phase='overdue' then mod(today-due_on,overdue_every)=0 else true end
 from phased where (phase='soon' and notify_before) or (phase='today' and notify_on_due) or (phase='overdue' and notify_overdue)
$$;
revoke all on function private.owner_alert_candidates() from public,anon;
grant execute on function private.owner_alert_candidates() to authenticated;
create view public.owner_alerts with(security_invoker=true) as
 select a.*,r.read_at is not null is_read from private.owner_alert_candidates() a left join public.owner_notification_reads r on r.staff_id=(select auth.uid()) and r.alert_key=a.alert_key;
revoke all on public.owner_alerts from public,anon;
grant select on public.owner_alerts to authenticated;

create function public.configure_owner_notifications(p_revision integer,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 update public.owner_notification_settings set enabled=(p_data->>'enabled')::boolean,customers_enabled=(p_data->>'customersEnabled')::boolean,expenses_enabled=(p_data->>'expensesEnabled')::boolean,
 notify_before=(p_data->>'notifyBefore')::boolean,days_before=(p_data->>'daysBefore')::smallint,notify_on_due=(p_data->>'notifyOnDue')::boolean,notify_overdue=(p_data->>'notifyOverdue')::boolean,
 overdue_every=(p_data->>'overdueEvery')::smallint,send_hour=(p_data->>'sendHour')::smallint,revision=revision+1,updated_at=now() where id and revision=p_revision;
 if not found then raise exception 'STALE_NOTIFICATION_SETTINGS';end if;
end $$;
revoke all on function public.configure_owner_notifications(integer,jsonb) from public,anon;
grant execute on function public.configure_owner_notifications(integer,jsonb) to authenticated;

-- Endpoints/keys are capabilities, not customer contact records. No direct client access.
create table private.owner_push_subscriptions(
 id uuid primary key default gen_random_uuid(),staff_id uuid not null references public.staff(id),session_id uuid not null,endpoint text unique not null check(length(endpoint)<=4096),
 p256dh text not null,auth_key text not null,active boolean not null default true,last_test_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table private.owner_push_subscriptions enable row level security;
revoke all on private.owner_push_subscriptions from public,anon,authenticated;
create index owner_push_staff_idx on private.owner_push_subscriptions(staff_id);
create index owner_push_session_idx on private.owner_push_subscriptions(session_id);
create table private.owner_push_deliveries(
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references private.owner_push_subscriptions(id) on delete cascade,notification_day date not null,
 alert_keys text[] not null,status text not null default 'queued' check(status in('queued','sending','accepted','failed','gone','unknown')),attempts smallint not null default 0,
 lease_id uuid,lease_until timestamptz,provider_code integer,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(subscription_id,notification_day)
);
alter table private.owner_push_deliveries enable row level security;
revoke all on private.owner_push_deliveries from public,anon,authenticated;
create index owner_push_delivery_pending_idx on private.owner_push_deliveries(status,notification_day) where status in('queued','sending','failed');

create function public.register_owner_push(p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare endpoint_text text:=p_data->>'endpoint';
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 if coalesce(endpoint_text,'') !~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[A-Za-z0-9-]+[.]notify[.]windows[.]com)/[^[:space:]]+$' or length(endpoint_text)>4096
 or coalesce(p_data->>'p256dh','') !~ '^[A-Za-z0-9_-]{87}$' or coalesce(p_data->>'auth','') !~ '^[A-Za-z0-9_-]{22}$' then raise exception 'INVALID_PUSH_SUBSCRIPTION';end if;
 if exists(select 1 from private.owner_push_subscriptions where endpoint=endpoint_text and staff_id<>auth.uid()) then raise exception 'SUBSCRIPTION_IN_USE';end if;
 insert into private.owner_push_subscriptions(staff_id,session_id,endpoint,p256dh,auth_key) values(auth.uid(),(auth.jwt()->>'session_id')::uuid,endpoint_text,p_data->>'p256dh',p_data->>'auth')
 on conflict(endpoint) do update set session_id=excluded.session_id,p256dh=excluded.p256dh,auth_key=excluded.auth_key,active=true,updated_at=now() where private.owner_push_subscriptions.staff_id=auth.uid();
 if not found then raise exception 'SUBSCRIPTION_IN_USE';end if;
end $$;
create function public.owner_push_status(p_endpoint text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 return exists(select 1 from private.owner_push_subscriptions where endpoint=p_endpoint and staff_id=auth.uid() and session_id=(auth.jwt()->>'session_id')::uuid and active);
end $$;
create function public.unregister_owner_push(p_endpoint text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 update private.owner_push_subscriptions set active=false,updated_at=now() where staff_id=auth.uid() and endpoint=p_endpoint;
end $$;
create function public.reserve_owner_push_test(p_endpoint text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 update private.owner_push_subscriptions set last_test_at=now() where endpoint=p_endpoint and staff_id=auth.uid() and session_id=(auth.jwt()->>'session_id')::uuid and active and(last_test_at is null or last_test_at<now()-interval '1 minute');
 return found;
end $$;
revoke all on function public.register_owner_push(jsonb),public.owner_push_status(text),public.unregister_owner_push(text),public.reserve_owner_push_test(text) from public,anon;
grant execute on function public.register_owner_push(jsonb),public.owner_push_status(text),public.unregister_owner_push(text),public.reserve_owner_push_test(text) to authenticated;

-- A dedicated Auth identity has no staff row and cannot read or modify gym finances.
-- Authorization uses the current admin-controlled metadata and live session, not user_metadata.
create function private.is_owner_notification_worker() returns boolean
language sql stable security definer set search_path='' as $$
select exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id where u.id=(select auth.uid()) and u.raw_app_meta_data->>'shelby_notification_worker'='true'
 and(u.banned_until is null or u.banned_until<now()) and s.id=((select auth.jwt())->>'session_id')::uuid and(s.not_after is null or s.not_after>now()))
$$;
revoke all on function private.is_owner_notification_worker() from public,anon,authenticated;

create table private.owner_notification_health(id boolean primary key default true check(id),last_check_at timestamptz);
insert into private.owner_notification_health(id) values(true);
alter table private.owner_notification_health enable row level security;
revoke all on private.owner_notification_health from public,anon,authenticated;
create function public.owner_notification_health() returns timestamptz
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 return (select last_check_at from private.owner_notification_health where id);
end $$;
revoke all on function public.owner_notification_health() from public,anon;
grant execute on function public.owner_notification_health() to authenticated;

create function public.claim_owner_push_jobs(p_limit integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare today date; hour_now integer; settings public.owner_notification_settings; result jsonb;
begin
 if not private.is_owner_notification_worker() then raise exception 'FORBIDDEN';end if;
 if p_limit is null or p_limit<1 or p_limit>50 then raise exception 'INVALID_LIMIT';end if;
 select (now() at time zone time_zone)::date,extract(hour from now() at time zone time_zone)::integer into today,hour_now from public.gym_settings where id;
 select * into settings from public.owner_notification_settings where id;
 update private.owner_notification_health set last_check_at=now() where id;
 if not settings.enabled or hour_now<settings.send_hour then return '[]'::jsonb;end if;
 update private.owner_push_deliveries set status='unknown',updated_at=now() where status='sending' and lease_until<now();
 insert into private.owner_push_deliveries(subscription_id,notification_day,alert_keys)
 select device.id,today,candidate.keys from private.owner_push_subscriptions device
 join public.staff staff on staff.id=device.staff_id and staff.active and staff.role='owner'
 join auth.sessions session on session.id=device.session_id and session.user_id=staff.id and(session.not_after is null or session.not_after>now())
 join auth.users owner_user on owner_user.id=staff.id and(owner_user.banned_until is null or owner_user.banned_until<now())
 cross join lateral(select array_agg(a.alert_key) keys from private.owner_alert_candidates() a where a.push_today and(a.phase<>'soon' or not exists(
  select 1 from private.owner_push_deliveries previous where previous.subscription_id=device.id and previous.status='accepted' and a.alert_key=any(previous.alert_keys)))) candidate
 where device.active and candidate.keys is not null on conflict(subscription_id,notification_day) do nothing;
 -- Recheck candidates before claiming: payments/renewals remove obsolete alerts.
 update private.owner_push_deliveries d set status='gone',updated_at=now() where d.notification_day=today and d.status in('queued','failed') and not exists(select 1 from private.owner_alert_candidates() a where a.push_today and a.alert_key=any(d.alert_keys));
 with next_jobs as(select d.id from private.owner_push_deliveries d join private.owner_push_subscriptions s on s.id=d.subscription_id
  join public.staff staff on staff.id=s.staff_id and staff.active and staff.role='owner' join auth.sessions session on session.id=s.session_id and(session.not_after is null or session.not_after>now())
  join auth.users owner_user on owner_user.id=staff.id and(owner_user.banned_until is null or owner_user.banned_until<now())
  where s.active and d.notification_day=today and d.status in('queued','failed') and d.attempts<3 order by d.created_at,d.id limit p_limit for update of d skip locked),
 claimed as(update private.owner_push_deliveries d set status='sending',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '10 minutes',updated_at=now() from next_jobs n where d.id=n.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'leaseId',d.lease_id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_key)),'[]'::jsonb) into result
 from claimed d join private.owner_push_subscriptions s on s.id=d.subscription_id;
 return result;
end $$;
create function public.finish_owner_push_job(p_id uuid,p_lease uuid,p_status text,p_code integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare device uuid;
begin
 if not private.is_owner_notification_worker() then raise exception 'FORBIDDEN';end if;
 if p_status not in('accepted','failed','gone','unknown') then raise exception 'INVALID_STATUS';end if;
 update private.owner_push_deliveries set status=p_status,provider_code=p_code,updated_at=now() where id=p_id and lease_id=p_lease and status='sending' returning subscription_id into device;
 if device is null then raise exception 'STALE_PUSH_JOB';end if;
 if p_status='gone' then update private.owner_push_subscriptions set active=false,updated_at=now() where id=device;end if;
end $$;
revoke all on function public.claim_owner_push_jobs(integer),public.finish_owner_push_job(uuid,uuid,text,integer) from public,anon;
grant execute on function public.claim_owner_push_jobs(integer),public.finish_owner_push_job(uuid,uuid,text,integer) to authenticated;

-- Preserve historical settings/contacts but stop the superseded WhatsApp-to-owner path.
update public.communication_rules set enabled=false,revision=revision+1,updated_at=now() where kind='expense';
update public.communication_outbox set status='cancelled',note='Reemplazado por avisos dentro de la app.',updated_at=now() where source='expense' and status='prepared';
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime' and not puballtables) then
  alter publication supabase_realtime add table public.owner_notification_reads,public.owner_notification_settings;
 end if;
end $$;
notify pgrst,'reload schema';
