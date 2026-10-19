-- Owner-only onboarding. Opening credits are provenance, never fabricated payments.
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null check(length(source) between 1 and 80),
  request_id uuid not null unique,
  fingerprint text not null,
  result jsonb not null,
  created_by uuid not null references public.staff(id),
  created_at timestamptz not null default now()
);
create index import_batches_actor_idx on public.import_batches(created_by);
create table public.import_customers (
  source text not null,
  external_id text not null check(length(external_id) between 1 and 100),
  customer_id uuid not null references public.customers(id),
  batch_id uuid not null references public.import_batches(id),
  fingerprint text not null,
  primary key(source,external_id)
);
create index import_customers_customer_idx on public.import_customers(customer_id);
create index import_customers_batch_idx on public.import_customers(batch_id);
alter table public.import_batches enable row level security;
alter table public.import_customers enable row level security;
revoke all on public.import_batches,public.import_customers from public,anon,authenticated;
grant select on public.import_batches,public.import_customers to authenticated;
create policy import_batches_owner on public.import_batches for select to authenticated using ((select private.staff_role())='owner');
create policy import_customers_owner on public.import_customers for select to authenticated using ((select private.staff_role())='owner');
alter table public.subscriptions add column opening_paid_cents integer not null default 0 check(opening_paid_cents between 0 and total_cents);
alter table public.subscriptions add column import_batch_id uuid references public.import_batches(id);
alter table public.subscriptions add constraint imported_credit_provenance check(opening_paid_cents=0 or import_batch_id is not null);
create index subscriptions_import_batch_idx on public.subscriptions(import_batch_id) where import_batch_id is not null;

create or replace view public.subscription_balances with (security_invoker=true) as
select s.id,s.customer_id,s.activity_id,s.activity_name,s.activity_description,s.offer_label,s.total_cents,s.currency,s.starts_on,s.ends_on,s.duration_count,s.duration_unit,s.request_id,s.request_fingerprint,s.created_by,s.created_at,
 (s.opening_paid_cents+coalesce(p.paid_cents,0))::bigint as paid_cents,
 (s.total_cents-s.opening_paid_cents-coalesce(p.paid_cents,0))::bigint as balance_cents,
 s.opening_paid_cents,s.import_batch_id
from public.subscriptions s left join lateral (
 select sum(e.amount_cents) as paid_cents from public.payment_batches b join public.payment_entries e on e.batch_id=b.id where b.subscription_id=s.id
) p on true;

create function public.import_customer_rows(p_request uuid,p_source text,p_currency text,p_rows jsonb,p_commit boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 config public.gym_settings; prior public.import_batches; linked public.import_customers;
 r jsonb; issues jsonb:='[]'; result jsonb; new_count integer:=0; skipped integer:=0;
 batch uuid; customer uuid; activity public.activities; fingerprint text; source_key text;
 row_no integer; total integer; balance integer; starts date; ends date;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_request is null or p_source is null or length(trim(p_source)) not between 1 and 80 or jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'INVALID_IMPORT'; end if;
 if jsonb_array_length(p_rows) not between 1 and 500 or octet_length(p_rows::text)>700000 then raise exception 'INVALID_IMPORT'; end if;
 source_key:=lower(trim(p_source));
 fingerprint:=md5(source_key||coalesce(p_currency,'')||p_rows::text);
 -- Lock order is shared by imports; normal writes to customers wait for the commit.
 if p_commit is true then
   perform pg_advisory_xact_lock(hashtextextended('customer-import',0));
   lock table public.customers in share row exclusive mode;
 end if;
 select * into config from public.gym_settings where id=true for share;
 if not found or config.currency is distinct from p_currency then raise exception 'IMPORT_CURRENCY_CHANGED'; end if;
 select * into prior from public.import_batches where request_id=p_request;
 if found then
   if prior.created_by<>auth.uid() or prior.fingerprint<>fingerprint then raise exception 'REQUEST_CONFLICT'; end if;
   return prior.result;
 end if;
 -- Validate every row before writing any of them. Preview and commit share this path.
 for r in select value from jsonb_array_elements(p_rows) loop
  row_no:=coalesce((r->>'row')::integer,0);
  if jsonb_typeof(r) is distinct from 'object' or row_no<2
     or coalesce(length(trim(r->>'external_id')),0) not between 1 and 100
     or coalesce(length(trim(r->>'name')),0) not between 2 and 120
     or coalesce(length(r->>'phone'),0)>40 or coalesce(length(r->>'email'),0)>254
     or (coalesce(r->>'email','')<>'' and (r->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    issues:=issues||jsonb_build_object('row',row_no,'message','Revisá ID, nombre, teléfono o correo.'); continue;
  end if;
  if (select count(*) from jsonb_array_elements(p_rows) x where trim(x->>'external_id')=trim(r->>'external_id'))>1 then
    issues:=issues||jsonb_build_object('row',row_no,'message','El ID se repite en este archivo. Usá una fila por cliente.'); continue;
  end if;
  select * into linked from public.import_customers where source=source_key and external_id=trim(r->>'external_id');
  if found then
   if linked.fingerprint=md5((r-'row')::text) then skipped:=skipped+1;
   else issues:=issues||jsonb_build_object('row',row_no,'message','Este ID ya se importó con otros datos. Revisá el perfil existente.'); end if;
   continue;
  end if;
  if exists(select 1 from public.customers c where lower(trim(c.name))=lower(trim(r->>'name'))
     or (coalesce(r->>'email','')<>'' and lower(c.email)=lower(r->>'email'))
     or (regexp_replace(coalesce(r->>'phone',''),'[^0-9]','','g')<>'' and regexp_replace(c.phone,'[^0-9]','','g')=regexp_replace(r->>'phone','[^0-9]','','g')))
    or (select count(*) from jsonb_array_elements(p_rows) x where lower(trim(x->>'name'))=lower(trim(r->>'name'))
     or (coalesce(r->>'email','')<>'' and lower(x->>'email')=lower(r->>'email'))
     or (regexp_replace(coalesce(r->>'phone',''),'[^0-9]','','g')<>'' and regexp_replace(coalesce(x->>'phone',''),'[^0-9]','','g')=regexp_replace(r->>'phone','[^0-9]','','g')))>1 then
    issues:=issues||jsonb_build_object('row',row_no,'message','Posible duplicado por nombre, teléfono o correo. Revisalo antes de importar.'); continue;
  end if;
  if coalesce(r->>'activity_id','')<>'' then
   if not pg_input_is_valid(r->>'activity_id','uuid') then
     issues:=issues||jsonb_build_object('row',row_no,'message','Elegí una actividad existente.'); continue;
   end if;
   select * into activity from public.activities where id=(r->>'activity_id')::uuid for share;
   if not found then issues:=issues||jsonb_build_object('row',row_no,'message','La actividad ya no existe.'); continue; end if;
   if not coalesce(pg_input_is_valid(r->>'starts_on','date'),false) or not coalesce(pg_input_is_valid(r->>'ends_on','date'),false)
      or coalesce(r->>'starts_on','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(r->>'ends_on','') !~ '^\d{4}-\d{2}-\d{2}$'
      or not coalesce(pg_input_is_valid(r->>'total_cents','integer'),false) or not coalesce(pg_input_is_valid(r->>'balance_cents','integer'),false) then
    issues:=issues||jsonb_build_object('row',row_no,'message','Completá fechas válidas, cuota y saldo.'); continue;
   end if;
   starts:=(r->>'starts_on')::date; ends:=(r->>'ends_on')::date; total:=(r->>'total_cents')::integer; balance:=(r->>'balance_cents')::integer;
   if starts<'1900-01-01'::date or ends>'2200-12-31'::date or ends<=starts or total not between 1 and 100000000 or balance not between 0 and total then
    issues:=issues||jsonb_build_object('row',row_no,'message','Revisá el orden de las fechas y que 0 ≤ saldo ≤ cuota.'); continue;
   end if;
  elsif coalesce(r->>'starts_on','')<>'' or coalesce(r->>'ends_on','')<>'' or r->>'total_cents' is not null or r->>'balance_cents' is not null then
   issues:=issues||jsonb_build_object('row',row_no,'message','Asigná una actividad para importar una cuota.'); continue;
  end if;
  new_count:=new_count+1;
 end loop;
 result:=jsonb_build_object('created',new_count,'skipped',skipped,'issues',issues,'committed',false);
 if jsonb_array_length(issues)>0 or p_commit is not true then return result; end if;
 result:=jsonb_set(result,'{committed}','true');
 if new_count=0 then return result; end if;
 insert into public.import_batches(source,request_id,fingerprint,result,created_by)
 values(source_key,p_request,fingerprint,result,auth.uid()) returning id into batch;
 for r in select value from jsonb_array_elements(p_rows) loop
  if exists(select 1 from public.import_customers where source=source_key and external_id=trim(r->>'external_id')) then continue; end if;
  insert into public.customers(name,phone,email,created_by)
  values(trim(r->>'name'),coalesce(r->>'phone',''),coalesce(r->>'email',''),auth.uid()) returning id into customer;
  insert into public.import_customers(source,external_id,customer_id,batch_id,fingerprint)
  values(source_key,trim(r->>'external_id'),customer,batch,md5((r-'row')::text));
  if coalesce(r->>'activity_id','')<>'' then
   select * into activity from public.activities where id=(r->>'activity_id')::uuid;
   insert into public.subscriptions(customer_id,activity_id,activity_name,activity_description,total_cents,currency,starts_on,ends_on,duration_count,duration_unit,request_id,request_fingerprint,created_by,opening_paid_cents,import_batch_id)
   values(customer,activity.id,activity.name,activity.description,(r->>'total_cents')::integer,config.currency,(r->>'starts_on')::date,(r->>'ends_on')::date,(r->>'ends_on')::date-(r->>'starts_on')::date,'days',gen_random_uuid(),md5(r::text),auth.uid(),(r->>'total_cents')::integer-(r->>'balance_cents')::integer,batch);
  end if;
 end loop;
 return result;
end $$;
revoke all on function public.import_customer_rows(uuid,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.import_customer_rows(uuid,text,text,jsonb,boolean) to authenticated;

-- Future payments must also respect the imported opening credit.
create or replace function private.apply_payment(p_subscription uuid,p_request uuid,p_entries jsonb) returns uuid
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
  if incoming is null or incoming<=0 or sub.opening_paid_cents+paid+incoming>sub.total_cents then raise exception 'OVERPAYMENT'; end if;
  insert into public.payment_batches(subscription_id,request_id,created_by) values(p_subscription,p_request,auth.uid()) returning id into payment_id;
  insert into public.payment_entries(batch_id,method,amount_cents) select payment_id,x->>'method',(x->>'amount')::integer from jsonb_array_elements(canonical) x;
  return payment_id;
end $$;

