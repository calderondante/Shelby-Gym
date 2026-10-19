-- Explicit aliases keep SQL row values distinct from PL/pgSQL loop variables.
create or replace function public.import_gym_history(p_request uuid,p_source text,p_currency text,p_clients jsonb,p_commit boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 profiles jsonb:='[]'; issues jsonb:='[]'; report jsonb; c jsonb; s jsonb; p jsonb; e jsonb;
 config public.gym_settings; prior public.import_batches; linked public.import_customers;
 batch uuid; customer uuid; subscription uuid; payment uuid; activity public.activities;
 source_key text; request_fingerprint text; row_no integer; total integer; balance integer; paid bigint;
 period_count integer:=0; payment_count integer:=0; today date;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 if p_request is null or p_source is null or length(trim(p_source)) not between 1 and 80 or jsonb_typeof(p_clients) is distinct from 'array' then raise exception 'INVALID_IMPORT'; end if;
 if jsonb_array_length(p_clients) not between 1 and 500 or octet_length(p_clients::text)>700000 then raise exception 'INVALID_IMPORT'; end if;
 source_key:=lower(trim(p_source)); request_fingerprint:=md5(source_key||coalesce(p_currency,'')||p_clients::text);
 if p_commit is true then
  perform pg_advisory_xact_lock(hashtextextended('customer-import',0));
  lock table public.customers in share row exclusive mode;
 end if;
 select * into config from public.gym_settings where id=true for share;
 if not found or config.currency is distinct from p_currency then raise exception 'IMPORT_CURRENCY_CHANGED'; end if;
 today:=(now() at time zone config.time_zone)::date;
 select * into prior from public.import_batches where request_id=p_request;
 if found then
  if prior.created_by<>auth.uid() or prior.history_fingerprint is distinct from request_fingerprint then raise exception 'REQUEST_CONFLICT'; end if;
  return prior.result;
 end if;
 for c in select value from jsonb_array_elements(p_clients) loop
  row_no:=coalesce((c->>'row')::integer,0);
  profiles:=profiles||jsonb_build_object('row',row_no,'external_id',c->>'external_id','name',c->>'name','phone',coalesce(c->>'phone',''),'email',coalesce(c->>'email',''),'activity_id','','starts_on','','ends_on','','total_cents',null,'balance_cents',null);
  if c->>'age_years' is not null and (not pg_input_is_valid(c->>'age_years','integer') or (c->>'age_years')::integer not between 0 and 120 or not coalesce(pg_input_is_valid(c->>'age_as_of','date'),false)) then
   issues:=issues||jsonb_build_object('row',row_no,'message','Revisá la edad y su fecha de referencia.');
  elsif c->>'age_years' is not null and ((c->>'age_as_of')::date>today or (c->>'age_as_of')::date<'1900-01-01'::date) then
   issues:=issues||jsonb_build_object('row',row_no,'message','La fecha de la edad debe ser anterior o igual a hoy.');
  elsif c->>'age_years' is null and c->>'age_as_of' is not null then
   issues:=issues||jsonb_build_object('row',row_no,'message','No puede haber fecha de edad sin una edad.');
  end if;
  select * into linked from public.import_customers where source=source_key and external_id=trim(c->>'external_id');
  if found and linked.history_fingerprint is distinct from private.import_history_fingerprint(c) then
   issues:=issues||jsonb_build_object('row',row_no,'message','Este cliente ya se importó con otro historial. No sobrescribimos datos existentes.');
  end if;
  if jsonb_typeof(c->'periods') is distinct from 'array' then raise exception 'INVALID_IMPORT'; end if;
  period_count:=period_count+jsonb_array_length(c->'periods');
  if period_count>500 then raise exception 'INVALID_IMPORT'; end if;
  for s in select value from jsonb_array_elements(c->'periods') loop
   row_no:=coalesce((s->>'row')::integer,0);
   if coalesce(length(trim(s->>'external_id')),0) not between 1 and 100 or (select count(*) from jsonb_array_elements(c->'periods') x where x->>'external_id'=s->>'external_id')<>1 then
    issues:=issues||jsonb_build_object('row',row_no,'message','Usá un ID distinto para cada cuota del cliente.'); continue;
   end if;
   if not coalesce(pg_input_is_valid(s->>'activity_id','uuid'),false) then
    issues:=issues||jsonb_build_object('row',row_no,'message','Asigná una actividad existente.'); continue;
   end if;
   select * into activity from public.activities where id=(s->>'activity_id')::uuid for share;
   if not found then issues:=issues||jsonb_build_object('row',row_no,'message','La actividad no existe.'); continue; end if;
   if not coalesce(pg_input_is_valid(s->>'starts_on','date'),false) or not coalesce(pg_input_is_valid(s->>'ends_on','date'),false)
      or coalesce(s->>'starts_on','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(s->>'ends_on','') !~ '^\d{4}-\d{2}-\d{2}$'
      or not coalesce(pg_input_is_valid(s->>'total_cents','integer'),false) or not coalesce(pg_input_is_valid(s->>'balance_cents','integer'),false) then
    issues:=issues||jsonb_build_object('row',row_no,'message','Completá las fechas, cuota histórica y saldo.'); continue;
   end if;
   total:=(s->>'total_cents')::integer; balance:=(s->>'balance_cents')::integer;
   if (s->>'starts_on')::date<'1900-01-01'::date or (s->>'ends_on')::date>'2200-12-31'::date or (s->>'ends_on')::date<=(s->>'starts_on')::date or total not between 1 and 100000000 or balance not between 0 and total then
    issues:=issues||jsonb_build_object('row',row_no,'message','Revisá fechas y que 0 ≤ saldo ≤ cuota histórica.'); continue;
   end if;
   if jsonb_typeof(s->'payments') is distinct from 'array' then raise exception 'INVALID_IMPORT'; end if;
   payment_count:=payment_count+jsonb_array_length(s->'payments');
   if payment_count>1000 then raise exception 'INVALID_IMPORT'; end if;
   paid:=0;
   for p in select value from jsonb_array_elements(s->'payments') loop
    if coalesce(length(trim(p->>'external_id')),0) not between 1 and 100 or (select count(*) from jsonb_array_elements(s->'payments') x where x->>'external_id'=p->>'external_id')<>1
      or not coalesce(pg_input_is_valid(p->>'date','date'),false) or coalesce(p->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then
      issues:=issues||jsonb_build_object('row',row_no,'message','Revisá ID y fecha de los pagos anteriores.'); continue;
    end if;
    if (p->>'date')::date>today or (p->>'date')::date<'1900-01-01'::date then issues:=issues||jsonb_build_object('row',row_no,'message','Un pago anterior no puede tener fecha futura.'); end if;
    if jsonb_typeof(p->'entries') is distinct from 'array' or jsonb_array_length(p->'entries') not between 1 and 3 then raise exception 'INVALID_IMPORT'; end if;
    if (select count(distinct x->>'method') from jsonb_array_elements(p->'entries') x)<>jsonb_array_length(p->'entries') then issues:=issues||jsonb_build_object('row',row_no,'message','El pago repite un medio de cobro.'); end if;
    for e in select value from jsonb_array_elements(p->'entries') loop
     if coalesce(e->>'method','') not in ('cash','transfer','mercado_pago') or not coalesce(pg_input_is_valid(e->>'amount','integer'),false) then
      issues:=issues||jsonb_build_object('row',row_no,'message','Revisá medio e importe del pago.'); continue;
     end if;
     if (e->>'amount')::integer not between 1 and 100000000 then issues:=issues||jsonb_build_object('row',row_no,'message','Los pagos deben ser positivos.'); end if;
     paid:=paid+(e->>'amount')::integer;
    end loop;
   end loop;
   if paid>total-balance then issues:=issues||jsonb_build_object('row',row_no,'message','Los pagos detallados superan lo abonado según cuota y saldo.'); end if;
  end loop;
 end loop;
 report:=private.import_customer_rows(p_request,p_source,p_currency,profiles,false);
 issues:=(report->'issues')||issues;
 report:=report||jsonb_build_object('issues',issues,'periods',period_count,'payments',payment_count);
 if jsonb_array_length(issues)>0 or p_commit is not true then return report; end if;
 perform private.import_customer_rows(p_request,p_source,p_currency,profiles,true);
 select id into batch from public.import_batches where request_id=p_request;
 report:=report||jsonb_build_object('committed',true);
 if batch is null then return report; end if;
 update public.import_batches set history_fingerprint=request_fingerprint,result=jsonb_build_object('created',report->'created','skipped',report->'skipped','issues','[]'::jsonb,'periods',period_count,'payments',payment_count,'committed',true) where id=batch;
 for c in select value from jsonb_array_elements(p_clients) loop
  select * into linked from public.import_customers where source=source_key and external_id=trim(c->>'external_id');
  if linked.batch_id<>batch then continue; end if;
  customer:=linked.customer_id;
  update public.customers set age_years=(c->>'age_years')::integer,age_as_of=(c->>'age_as_of')::date where id=customer;
  update public.import_customers set history_fingerprint=private.import_history_fingerprint(c) where source=source_key and external_id=linked.external_id;
  for s in select value from jsonb_array_elements(c->'periods') loop
   select * into activity from public.activities where id=(s->>'activity_id')::uuid;
   select coalesce(sum((entry.value->>'amount')::integer),0) into paid from jsonb_array_elements(s->'payments') payment_row(value) cross join lateral jsonb_array_elements(payment_row.value->'entries') entry(value);
   insert into public.subscriptions(customer_id,activity_id,activity_name,activity_description,total_cents,currency,starts_on,ends_on,duration_count,duration_unit,request_id,request_fingerprint,created_by,opening_paid_cents,import_batch_id)
   values(customer,activity.id,activity.name,activity.description,(s->>'total_cents')::integer,config.currency,(s->>'starts_on')::date,(s->>'ends_on')::date,(s->>'ends_on')::date-(s->>'starts_on')::date,'days',gen_random_uuid(),md5(s::text),auth.uid(),(s->>'total_cents')::integer-(s->>'balance_cents')::integer-paid,batch) returning id into subscription;
   for p in select value from jsonb_array_elements(s->'payments') loop
    insert into public.payment_batches(subscription_id,request_id,created_by,occurred_on,import_batch_id)
    values(subscription,gen_random_uuid(),auth.uid(),(p->>'date')::date,batch) returning id into payment;
    insert into public.payment_entries(batch_id,method,amount_cents) select payment,entry.value->>'method',(entry.value->>'amount')::integer from jsonb_array_elements(p->'entries') entry(value);
   end loop;
  end loop;
 end loop;
 return report;
end $$;
