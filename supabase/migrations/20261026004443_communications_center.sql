-- Communications preparation only: there is no provider connection and no sent status.
alter table public.customers add column instagram_marketing_opt_in boolean not null default false;
create or replace view public.customer_overview with(security_invoker=true) as
select c.id,c.name,c.phone,c.email,c.notes,c.revision,c.created_by,c.created_at,c.updated_at,
 coalesce(b.balance_cents,0)::bigint as balance_cents,b.last_end,b.activity_names,coalesce(b.has_active,false) as has_active,c.status,c.status_changed_at,
 c.instagram,c.marketing_opt_in,c.instagram_marketing_opt_in
from public.customers c left join lateral (
 select sum(s.balance_cents) as balance_cents,max(s.ends_on) as last_end,string_agg(distinct s.activity_name,' · ') as activity_names,
 bool_or(s.starts_on<=(now() at time zone g.time_zone)::date and (s.ends_on>(now() at time zone g.time_zone)::date or s.sessions_remaining>0)) as has_active
 from public.subscription_balances s cross join public.gym_settings g where s.customer_id=c.id
) b on true;
create table public.communication_settings (
 id boolean primary key default true check(id),business_name text not null default 'Shelby Gym' check(length(trim(business_name)) between 2 and 100),
 whatsapp_phone text not null default '' check(whatsapp_phone='' or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
 instagram_handle text not null default '' check(instagram_handle='' or instagram_handle ~ '^@[A-Za-z0-9_.]{1,30}$'),
 revision integer not null default 1,updated_by uuid references public.staff(id),updated_at timestamptz not null default now()
);
insert into public.communication_settings(id) values(true);
create table public.communication_templates (
 id uuid primary key default gen_random_uuid(),slug text unique,title text not null check(length(trim(title)) between 2 and 100),
 channel text not null check(channel in ('whatsapp','instagram')),purpose text not null check(purpose in ('general','recovery','expense')),
 body text not null check(length(trim(body)) between 5 and 1500),revision integer not null default 1,updated_by uuid references public.staff(id),updated_at timestamptz not null default now(),
 check(purpose<>'expense' or channel='whatsapp')
);
insert into public.communication_templates(slug,title,channel,purpose,body) values
 ('recovery-wa','Volvé a entrenar','whatsapp','recovery','Hola {nombre}, en {gimnasio} te esperamos para volver a entrenar. {oferta} ¿Querés que te contemos?'),
 ('general-wa','Novedades del gimnasio','whatsapp','general','Hola {nombre}, te escribimos de {gimnasio}. {oferta}'),
 ('general-ig','Novedades por Instagram','instagram','general','Hola {nombre}, te escribimos de {gimnasio}. {oferta}'),
 ('recovery-ig','Regreso por Instagram','instagram','recovery','Hola {nombre}, tenemos una propuesta para tu regreso a {gimnasio}. {oferta}'),
 ('expense-wa','Vencimiento de boleta','whatsapp','expense','Hola {dueno}, aviso de {gimnasio}: {gasto} vence el {vencimiento}. Importe: {importe}. Pendiente: {saldo}.');
create table public.communication_owner_contacts (
 id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 2 and 100),
 phone text not null check(phone ~ '^\+[1-9][0-9]{7,14}$'),active boolean not null default true,
 revision integer not null default 1,created_by uuid not null references public.staff(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(phone)
);
create table public.communication_rules (
 kind text primary key check(kind in ('recovery','expense')),enabled boolean not null default false,
 channel text not null default 'whatsapp' check(channel in ('whatsapp','instagram')),
 template_id uuid not null references public.communication_templates(id),send_hour smallint not null default 9 check(send_hour between 0 and 23),
 audience text not null default 'selected' check(audience in ('selected','all_eligible')),
 notify_before boolean not null default true,days_before smallint not null default 3 check(days_before between 1 and 30),
 notify_on_due boolean not null default true,notify_overdue boolean not null default true,overdue_every smallint not null default 1 check(overdue_every between 1 and 30),
 recurring_only boolean not null default true,offer text not null default '' check(length(offer)<=500),
 revision integer not null default 1,updated_by uuid references public.staff(id),updated_at timestamptz not null default now(),check(kind<>'expense' or channel='whatsapp')
);
insert into public.communication_rules(kind,template_id) select 'recovery',id from public.communication_templates where slug='recovery-wa';
insert into public.communication_rules(kind,template_id) select 'expense',id from public.communication_templates where slug='expense-wa';
create table public.communication_rule_customers (
 rule_kind text not null references public.communication_rules(kind),customer_id uuid not null references public.customers(id),primary key(rule_kind,customer_id)
);
alter table public.campaigns drop constraint campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check check(status in ('draft','prepared','cancelled'));
alter table public.campaigns add column channel text not null default 'whatsapp' check(channel in ('whatsapp','instagram')),
 add column segment text not null default 'recovery' check(segment in ('selected','recovery')),
 add column template_id uuid references public.communication_templates(id),add column scheduled_for timestamptz,
 add column offer text not null default '' check(length(offer)<=500),add column preparation_fingerprint text;
create table public.communication_outbox (
 id uuid primary key default gen_random_uuid(),dedup_key text not null unique,
 campaign_id uuid references public.campaigns(id),customer_id uuid references public.customers(id),owner_contact_id uuid references public.communication_owner_contacts(id),expense_id uuid references public.expenses(id),
 source text not null check(source in ('campaign','recovery','expense')),channel text not null check(channel in ('whatsapp','instagram')),
 template_id uuid references public.communication_templates(id),recipient_name text not null,destination text not null,body text not null check(length(body) between 1 and 5000),
 scheduled_for timestamptz not null,status text not null default 'prepared' check(status in ('prepared','cancelled')),
 note text not null default '',created_by uuid not null references public.staff(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((customer_id is not null and owner_contact_id is null) or (customer_id is null and owner_contact_id is not null)),
 check((source='expense' and expense_id is not null and owner_contact_id is not null) or (source<>'expense' and customer_id is not null))
);
create index communication_outbox_schedule_idx on public.communication_outbox(status,scheduled_for,id);
create index communication_outbox_customer_idx on public.communication_outbox(customer_id);
create index communication_outbox_owner_idx on public.communication_outbox(owner_contact_id);
create index communication_outbox_expense_idx on public.communication_outbox(expense_id);
create index communication_outbox_campaign_idx on public.communication_outbox(campaign_id);
create index communication_outbox_template_idx on public.communication_outbox(template_id);
create index communication_rules_template_idx on public.communication_rules(template_id);
create index communication_rule_customers_customer_idx on public.communication_rule_customers(customer_id);
create index campaigns_template_idx on public.campaigns(template_id);
alter table public.communication_settings enable row level security;
revoke all on public.communication_settings from public,anon,authenticated;
grant select on public.communication_settings to authenticated;
create policy communication_settings_owner on public.communication_settings for select to authenticated using ((select private.staff_role())='owner');
alter table public.communication_templates enable row level security;
revoke all on public.communication_templates from public,anon,authenticated;
grant select on public.communication_templates to authenticated;
create policy communication_templates_owner on public.communication_templates for select to authenticated using ((select private.staff_role())='owner');
alter table public.communication_owner_contacts enable row level security;
revoke all on public.communication_owner_contacts from public,anon,authenticated;
grant select on public.communication_owner_contacts to authenticated;
create policy communication_owner_contacts_owner on public.communication_owner_contacts for select to authenticated using ((select private.staff_role())='owner');
alter table public.communication_rules enable row level security;
revoke all on public.communication_rules from public,anon,authenticated;
grant select on public.communication_rules to authenticated;
create policy communication_rules_owner on public.communication_rules for select to authenticated using ((select private.staff_role())='owner');
alter table public.communication_rule_customers enable row level security;
revoke all on public.communication_rule_customers from public,anon,authenticated;
grant select on public.communication_rule_customers to authenticated;
create policy communication_rule_customers_owner on public.communication_rule_customers for select to authenticated using ((select private.staff_role())='owner');
alter table public.communication_outbox enable row level security;
revoke all on public.communication_outbox from public,anon,authenticated;
grant select on public.communication_outbox to authenticated;
create policy communication_outbox_owner on public.communication_outbox for select to authenticated using ((select private.staff_role())='owner');
create or replace function public.update_customer(p_id uuid,p_revision integer,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is null then raise exception 'FORBIDDEN'; end if;
 update public.customers set name=trim(p_data->>'name'),phone=coalesce(p_data->>'phone',''),email=coalesce(p_data->>'email',''),notes=coalesce(p_data->>'notes',''),
 birth_month=nullif(p_data->>'birthMonth','0')::smallint,
 instagram_marketing_opt_in=coalesce((p_data->>'instagramMarketingOptIn')::boolean,false),instagram=coalesce(p_data->>'instagram',''),marketing_opt_in=coalesce((p_data->>'marketingOptIn')::boolean,false),
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
    insert into public.customers(name,phone,email,notes,birth_month,instagram,marketing_opt_in,instagram_marketing_opt_in,created_by)
      values(trim(p_customer->>'name'),coalesce(p_customer->>'phone',''),coalesce(p_customer->>'email',''),coalesce(p_customer->>'notes',''),
        nullif(p_customer->>'birthMonth','0')::smallint,coalesce(p_customer->>'instagram',''),coalesce((p_customer->>'marketingOptIn')::boolean,false),coalesce((p_customer->>'instagramMarketingOptIn')::boolean,false),actor)
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


create function private.communication_phone(p_raw text) returns text language sql immutable set search_path='' as $$
 select case when regexp_replace(trim(p_raw),'[[:space:]().-]','','g') ~ '^\+[1-9][0-9]{7,14}$' then regexp_replace(trim(p_raw),'[[:space:]().-]','','g') else null end
$$;
create function private.render_communication(p_body text,p_values jsonb) returns text
language plpgsql immutable set search_path='' as $$
declare remaining text:=p_body; result text:=''; match text[]; token text; pos integer;
begin
 loop
  match:=regexp_match(remaining,'\{([a-z_]+)\}');exit when match is null;
  token:='{'||match[1]||'}';pos:=strpos(remaining,token);
  if not(p_values ? match[1]) then raise exception 'UNKNOWN_MESSAGE_VARIABLE'; end if;
  result:=result||left(remaining,pos-1)||coalesce(p_values->>match[1],'');remaining:=substr(remaining,pos+length(token));
 end loop;
 return result||remaining;
end $$;
create function private.communication_money(p_cents bigint) returns text language sql immutable set search_path='' as $$
 select '$ '||translate(to_char(p_cents::numeric/100,'FM999,999,999,990.00'),'.,',',.')
$$;
create function private.communication_customer(p_customer uuid,p_channel text,p_segment text,p_day date,p_offer text) returns jsonb
language plpgsql stable set search_path='' as $$
declare c public.customer_overview; dest text; business text;
begin
 select * into c from public.customer_overview where id=p_customer;
 if not found or c.status='retired' then raise exception 'RECIPIENTS_CHANGED'; end if;
 if p_segment='recovery' and (c.last_end is null or (c.last_end+interval '2 months')::date>p_day) then raise exception 'RECIPIENTS_CHANGED'; end if;
 if p_channel='whatsapp' then
  dest:=private.communication_phone(c.phone);if dest is null or not c.marketing_opt_in then raise exception 'RECIPIENTS_CHANGED'; end if;
 elsif p_channel='instagram' then
  dest:=c.instagram;if dest='' or not c.instagram_marketing_opt_in then raise exception 'RECIPIENTS_CHANGED'; end if;
 else raise exception 'INVALID_CHANNEL';end if;
 select business_name into business from public.communication_settings where id;
 return jsonb_build_object('nombre',c.name,'gimnasio',business,'actividad',coalesce(c.activity_names,'Sin actividad'),
 'vencimiento',coalesce(to_char(c.last_end,'DD/MM/YYYY'),'Sin cuota mensual'),'saldo',private.communication_money(c.balance_cents),'oferta',coalesce(p_offer,''),'destination',dest);
end $$;
create function public.save_communication_settings(p_revision integer,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 update public.communication_settings set business_name=trim(p_data->>'businessName'),whatsapp_phone=coalesce(p_data->>'whatsappPhone',''),instagram_handle=coalesce(p_data->>'instagramHandle',''),revision=revision+1,updated_by=auth.uid(),updated_at=now() where id and revision=p_revision;
 if not found then raise exception 'STALE_COMMUNICATION';end if;
end $$;
create function public.save_communication_template(p_id uuid,p_revision integer,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; vars jsonb;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 vars:=case when p_data->>'purpose'='expense' then '{"nombre":"","dueno":"","gimnasio":"","gasto":"","importe":"","saldo":"","vencimiento":"","dias":""}'::jsonb else '{"nombre":"","gimnasio":"","actividad":"","vencimiento":"","saldo":"","oferta":""}'::jsonb end;
 perform private.render_communication(p_data->>'body',vars);
 if p_id is null then
 insert into public.communication_templates(title,channel,purpose,body,updated_by) values(trim(p_data->>'title'),p_data->>'channel',p_data->>'purpose',trim(p_data->>'body'),auth.uid()) returning id into result;
 else
 update public.communication_templates set title=trim(p_data->>'title'),channel=p_data->>'channel',purpose=p_data->>'purpose',body=trim(p_data->>'body'),revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=p_id and revision=p_revision returning id into result;
 if result is null then raise exception 'STALE_COMMUNICATION';end if;
 -- Active rules must retain a compatible template.
 if exists(select 1 from public.communication_rules r join public.communication_templates t on t.id=r.template_id where t.id=result and (r.channel<>t.channel or r.kind<>t.purpose)) then raise exception 'TEMPLATE_MISMATCH';end if;
 end if;return result;
end $$;
create function public.save_communication_owner(p_id uuid,p_revision integer,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 if p_id is null then insert into public.communication_owner_contacts(name,phone,active,created_by) values(trim(p_data->>'name'),p_data->>'phone',(p_data->>'active')::boolean,auth.uid()) returning id into result;
 else update public.communication_owner_contacts set name=trim(p_data->>'name'),phone=p_data->>'phone',active=(p_data->>'active')::boolean,revision=revision+1,updated_at=now() where id=p_id and revision=p_revision returning id into result;
 if result is null then raise exception 'STALE_COMMUNICATION';end if;end if;return result;
end $$;
create function public.save_communication_rule(p_kind text,p_revision integer,p_data jsonb,p_customers uuid[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare template public.communication_templates;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 if p_kind not in ('recovery','expense') or p_kind is null or cardinality(p_customers)>500 then raise exception 'INVALID_RULE';end if;
 select * into template from public.communication_templates where id=(p_data->>'templateId')::uuid;
 if not found or template.purpose<>p_kind or template.channel<>p_data->>'channel' then raise exception 'TEMPLATE_MISMATCH';end if;
 if exists(select 1 from unnest(p_customers) c where not exists(select 1 from public.customers where id=c)) then raise exception 'RECIPIENTS_CHANGED';end if;
 if p_kind='recovery' and (p_data->>'enabled')::boolean and p_data->>'audience'='selected' and coalesce(cardinality(p_customers),0)=0 then raise exception 'SELECT_RECIPIENTS';end if;
 update public.communication_rules set enabled=(p_data->>'enabled')::boolean,channel=p_data->>'channel',template_id=template.id,send_hour=(p_data->>'sendHour')::smallint,audience=p_data->>'audience',
 notify_before=(p_data->>'notifyBefore')::boolean,days_before=(p_data->>'daysBefore')::smallint,notify_on_due=(p_data->>'notifyOnDue')::boolean,notify_overdue=(p_data->>'notifyOverdue')::boolean,overdue_every=(p_data->>'overdueEvery')::smallint,recurring_only=(p_data->>'recurringOnly')::boolean,offer=coalesce(p_data->>'offer',''),revision=revision+1,updated_by=auth.uid(),updated_at=now()
 where kind=p_kind and revision=p_revision;
 if not found then raise exception 'STALE_COMMUNICATION';end if;
 delete from public.communication_rule_customers where rule_kind=p_kind;
 insert into public.communication_rule_customers(rule_kind,customer_id) select p_kind,c from unnest(p_customers) c on conflict do nothing;
end $$;
create function public.prepare_communication_campaign(p_request uuid,p_data jsonb,p_customers uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; old public.campaigns; fingerprint text; c uuid; context jsonb; day date; template public.communication_templates; planned timestamptz; body text;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 if p_request is null or p_customers is null or cardinality(p_customers) not between 1 and 500 or cardinality(p_customers)<>(select count(distinct x) from unnest(p_customers) x) then raise exception 'SELECT_RECIPIENTS';end if;
 if p_data->>'channel' not in ('whatsapp','instagram') or p_data->>'segment' not in ('selected','recovery') then raise exception 'INVALID_CHANNEL';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 fingerprint:=md5(p_data::text||p_customers::text);
 select * into old from public.campaigns where request_id=p_request;
 if found then if old.created_by<>auth.uid() or old.preparation_fingerprint is distinct from fingerprint then raise exception 'REQUEST_CONFLICT';end if;return old.id;end if;
 select (now() at time zone time_zone)::date into day from public.gym_settings where id;
 planned:=coalesce(nullif(p_data->>'scheduledFor','')::timestamptz,now());
 if planned>now()+interval '1 year' then raise exception 'INVALID_SCHEDULE';end if;
 select * into template from public.communication_templates where id=nullif(p_data->>'templateId','')::uuid;
 if not found or template.channel<>p_data->>'channel' or template.purpose='expense' then raise exception 'TEMPLATE_MISMATCH';end if;
 body:=trim(p_data->>'body');
 insert into public.campaigns(title,message,created_by,request_id,status,channel,segment,template_id,scheduled_for,offer,preparation_fingerprint)
 values(trim(p_data->>'title'),body,auth.uid(),p_request,'prepared',p_data->>'channel',p_data->>'segment',template.id,planned,coalesce(p_data->>'offer',''),fingerprint) returning id into result;
 foreach c in array p_customers loop
  context:=private.communication_customer(c,p_data->>'channel',p_data->>'segment',day,p_data->>'offer');
  insert into public.campaign_recipients(campaign_id,customer_id) values(result,c);
  insert into public.communication_outbox(dedup_key,campaign_id,customer_id,source,channel,template_id,recipient_name,destination,body,scheduled_for,created_by,note)
  values('campaign:'||result||':'||c,result,c,'campaign',template.channel,template.id,context->>'nombre',context->>'destination',private.render_communication(body,context),planned,auth.uid(),'Cuenta pendiente de vincular. Sin enviar.');
 end loop;return result;
end $$;
create function public.prepare_communication_automations(p_day date default null) returns integer
language plpgsql security definer set search_path='' as $$
declare day date; tz text; cfg public.communication_settings; rule public.communication_rules; template public.communication_templates; c record; e record; owner_row public.communication_owner_contacts; context jsonb; planned timestamptz; key text; phase text; n integer:=0; changed integer;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 select time_zone into tz from public.gym_settings where id;
 day:=coalesce(p_day,(now() at time zone tz)::date);
 if abs(day-(now() at time zone tz)::date)>366 then raise exception 'INVALID_SCHEDULE';end if;
 select * into cfg from public.communication_settings where id;
 perform pg_advisory_xact_lock(hashtextextended('communications-preview:'||day,0));
 -- Plans are invalidated when the membership is renewed, the client opts out, or the expense is paid.
 update public.communication_outbox o set status='cancelled',note='El destinatario o el saldo cambió. Revisar antes de preparar nuevamente.',updated_at=now()
 where status='prepared' and ((source='expense' and (not exists(select 1 from public.expense_balances e where e.id=o.expense_id and e.balance_cents>0) or not exists(select 1 from public.communication_owner_contacts c where c.id=o.owner_contact_id and c.active)))
 or (source='recovery' and not exists(select 1 from public.customer_overview c where c.id=o.customer_id and c.status<>'retired' and (c.last_end+interval '2 months')::date<=day and case when o.channel='whatsapp' then c.marketing_opt_in and private.communication_phone(c.phone) is not null else c.instagram_marketing_opt_in and c.instagram<>'' end)));
 for rule in select * from public.communication_rules where enabled loop
  select * into template from public.communication_templates where id=rule.template_id and channel=rule.channel and purpose=rule.kind;
  if not found then raise exception 'TEMPLATE_MISMATCH';end if;
  planned:=(day::timestamp+make_interval(hours=>rule.send_hour)) at time zone tz;
  if rule.kind='recovery' then
   for c in select v.* from public.customer_overview v where v.status<>'retired' and (v.last_end+interval '2 months')::date<=day
    and (rule.audience='all_eligible' or exists(select 1 from public.communication_rule_customers s where s.rule_kind='recovery' and s.customer_id=v.id))
    and case when rule.channel='whatsapp' then v.marketing_opt_in and private.communication_phone(v.phone) is not null else v.instagram_marketing_opt_in and v.instagram<>'' end loop
     context:=private.communication_customer(c.id,rule.channel,'recovery',day,rule.offer);key:='recovery:'||c.id||':'||c.last_end||':'||rule.channel;
     insert into public.communication_outbox(dedup_key,customer_id,source,channel,template_id,recipient_name,destination,body,scheduled_for,created_by,note)
     values(key,c.id,'recovery',rule.channel,template.id,c.name,context->>'destination',private.render_communication(template.body,context),planned,auth.uid(),'Regla preparada. Falta conectar la cuenta y activar el programador.') on conflict(dedup_key) do nothing;
     get diagnostics changed=row_count;n:=n+changed;
   end loop;
  else
   for e in select * from public.expense_balances where balance_cents>0 and (not rule.recurring_only or template_id is not null) loop
    phase:=case when rule.notify_before and day=e.due_on-rule.days_before then 'Antes del vencimiento' when rule.notify_on_due and day=e.due_on then 'Vence hoy' when rule.notify_overdue and day>e.due_on and mod(day-e.due_on-1,rule.overdue_every)=0 then 'Vencida y pendiente' else null end;
    if phase is null then continue;end if;
    for owner_row in select * from public.communication_owner_contacts where active loop
     context:=jsonb_build_object('nombre',owner_row.name,'dueno',owner_row.name,'gimnasio',cfg.business_name,'gasto',e.title,'importe',private.communication_money(e.total_cents),'saldo',private.communication_money(e.balance_cents),'vencimiento',to_char(e.due_on,'DD/MM/YYYY'),'dias',abs(day-e.due_on)::text);
     key:='expense:'||e.id||':'||owner_row.id||':'||day;
     insert into public.communication_outbox(dedup_key,owner_contact_id,expense_id,source,channel,template_id,recipient_name,destination,body,scheduled_for,created_by,note)
     values(key,owner_row.id,e.id,'expense','whatsapp',template.id,owner_row.name,owner_row.phone,private.render_communication(template.body,context),planned,auth.uid(),phase||'. Cuenta pendiente de vincular. Sin enviar.') on conflict(dedup_key) do update set body=excluded.body,destination=excluded.destination,recipient_name=excluded.recipient_name,template_id=excluded.template_id,scheduled_for=excluded.scheduled_for,note=excluded.note,updated_at=now() where communication_outbox.status='prepared';
     get diagnostics changed=row_count;n:=n+changed;
    end loop;
   end loop;
  end if;
 end loop;return n;
end $$;
create function public.cancel_communication(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 update public.communication_outbox set status='cancelled',note='Cancelado por el dueño antes de enviar.',updated_at=now() where id=p_id and status='prepared';
 if not found then raise exception 'MESSAGE_UNAVAILABLE';end if;
end $$;
revoke all on function private.communication_phone(text),private.render_communication(text,jsonb),private.communication_money(bigint),private.communication_customer(uuid,text,text,date,text) from public,anon,authenticated;
revoke all on function public.save_communication_settings(integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_communication_settings(integer,jsonb) to authenticated;
revoke all on function public.save_communication_template(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_communication_template(uuid,integer,jsonb) to authenticated;
revoke all on function public.save_communication_owner(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_communication_owner(uuid,integer,jsonb) to authenticated;
revoke all on function public.save_communication_rule(text,integer,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.save_communication_rule(text,integer,jsonb,uuid[]) to authenticated;
revoke all on function public.prepare_communication_campaign(uuid,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.prepare_communication_campaign(uuid,jsonb,uuid[]) to authenticated;
revoke all on function public.prepare_communication_automations(date) from public,anon,authenticated;
grant execute on function public.prepare_communication_automations(date) to authenticated;
revoke all on function public.cancel_communication(uuid) from public,anon,authenticated;
grant execute on function public.cancel_communication(uuid) to authenticated;
