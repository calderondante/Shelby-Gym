-- Avoid PL/pgSQL record/SQL alias collisions; invalidate plans after destination changes.
create or replace function public.prepare_communication_automations(p_day date default null) returns integer
language plpgsql security definer set search_path='' as $$
declare day date; tz text; cfg public.communication_settings; rule public.communication_rules; template public.communication_templates; customer_row record; bill_row record; owner_row public.communication_owner_contacts; context jsonb; planned timestamptz; key text; phase text; n integer:=0; changed integer;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN';end if;
 select time_zone into tz from public.gym_settings where id;
 day:=coalesce(p_day,(now() at time zone tz)::date);
 if abs(day-(now() at time zone tz)::date)>366 then raise exception 'INVALID_SCHEDULE';end if;
 select * into cfg from public.communication_settings where id;
 perform pg_advisory_xact_lock(hashtextextended('communications-preview:'||day,0));
 -- Plans are invalidated when the membership is renewed, the client opts out, or the expense is paid.
 update public.communication_outbox o set status='cancelled',note='El destinatario o el saldo cambió. Revisar antes de preparar nuevamente.',updated_at=now()
 where status='prepared' and ((source='expense' and (not exists(select 1 from public.expense_balances e where e.id=o.expense_id and e.balance_cents>0) or not exists(select 1 from public.communication_owner_contacts c where c.id=o.owner_contact_id and c.active and c.phone=o.destination)))
 or (source='recovery' and not exists(select 1 from public.customer_overview c where c.id=o.customer_id and c.status<>'retired' and (c.last_end+interval '2 months')::date<=day and case when o.channel='whatsapp' then c.marketing_opt_in and private.communication_phone(c.phone)=o.destination else c.instagram_marketing_opt_in and c.instagram=o.destination end)));
 for rule in select * from public.communication_rules where enabled loop
  select * into template from public.communication_templates where id=rule.template_id and channel=rule.channel and purpose=rule.kind;
  if not found then raise exception 'TEMPLATE_MISMATCH';end if;
  planned:=(day::timestamp+make_interval(hours=>rule.send_hour)) at time zone tz;
  if rule.kind='recovery' then
   for customer_row in select v.* from public.customer_overview v where v.status<>'retired' and (v.last_end+interval '2 months')::date<=day
    and (rule.audience='all_eligible' or exists(select 1 from public.communication_rule_customers s where s.rule_kind='recovery' and s.customer_id=v.id))
    and case when rule.channel='whatsapp' then v.marketing_opt_in and private.communication_phone(v.phone) is not null else v.instagram_marketing_opt_in and v.instagram<>'' end loop
     context:=private.communication_customer(customer_row.id,rule.channel,'recovery',day,rule.offer);key:='recovery:'||customer_row.id||':'||customer_row.last_end||':'||rule.channel;
     insert into public.communication_outbox(dedup_key,customer_id,source,channel,template_id,recipient_name,destination,body,scheduled_for,created_by,note)
     values(key,customer_row.id,'recovery',rule.channel,template.id,customer_row.name,context->>'destination',private.render_communication(template.body,context),planned,auth.uid(),'Regla preparada. Falta conectar la cuenta y activar el programador.') on conflict(dedup_key) do nothing;
     get diagnostics changed=row_count;n:=n+changed;
   end loop;
  else
   for bill_row in select * from public.expense_balances where balance_cents>0 and (not rule.recurring_only or template_id is not null) loop
    phase:=case when rule.notify_before and day=bill_row.due_on-rule.days_before then 'Antes del vencimiento' when rule.notify_on_due and day=bill_row.due_on then 'Vence hoy' when rule.notify_overdue and day>bill_row.due_on and mod(day-bill_row.due_on-1,rule.overdue_every)=0 then 'Vencida y pendiente' else null end;
    if phase is null then continue;end if;
    for owner_row in select * from public.communication_owner_contacts where active loop
     context:=jsonb_build_object('nombre',owner_row.name,'dueno',owner_row.name,'gimnasio',cfg.business_name,'gasto',bill_row.title,'importe',private.communication_money(bill_row.total_cents),'saldo',private.communication_money(bill_row.balance_cents),'vencimiento',to_char(bill_row.due_on,'DD/MM/YYYY'),'dias',abs(day-bill_row.due_on)::text);
     key:='expense:'||bill_row.id||':'||owner_row.id||':'||day;
     insert into public.communication_outbox(dedup_key,owner_contact_id,expense_id,source,channel,template_id,recipient_name,destination,body,scheduled_for,created_by,note)
     values(key,owner_row.id,bill_row.id,'expense','whatsapp',template.id,owner_row.name,owner_row.phone,private.render_communication(template.body,context),planned,auth.uid(),phase||'. Cuenta pendiente de vincular. Sin enviar.') on conflict(dedup_key) do update set body=excluded.body,destination=excluded.destination,recipient_name=excluded.recipient_name,template_id=excluded.template_id,scheduled_for=excluded.scheduled_for,note=excluded.note,updated_at=now() where communication_outbox.status='prepared';
     get diagnostics changed=row_count;n:=n+changed;
    end loop;
   end loop;
  end if;
 end loop;return n;
end $$;
