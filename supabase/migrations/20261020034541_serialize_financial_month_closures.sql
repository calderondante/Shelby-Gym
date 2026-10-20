-- A closing and a backdated write must observe one another, including unpaid imports.
create or replace function private.protect_closed_payment_month() returns trigger
language plpgsql security definer set search_path='' as $$
declare tz text; civil date; financial_month date;
begin
 select time_zone into tz from public.gym_settings where id;
 civil:=coalesce(new.occurred_on,(new.created_at at time zone tz)::date);
 financial_month:=date_trunc('month',civil)::date;
 perform pg_advisory_xact_lock(hashtextextended('month-'||financial_month,0));
 if exists(select 1 from public.monthly_closings where month=financial_month) then raise exception 'MONTH_CLOSED'; end if;
 return new;
end $$;
create trigger expense_payment_month_guard before insert on public.expense_payments
 for each row execute function private.protect_closed_payment_month();

create function private.protect_obligation_month() returns trigger
language plpgsql security definer set search_path='' as $$
declare months date[]; financial_month date;
begin
 if tg_table_name='subscriptions' then
  months:=array[date_trunc('month',new.starts_on)::date];
 else
  months:=array[date_trunc('month',new.due_on)::date];
  if tg_op='UPDATE' then months:=array_append(months,date_trunc('month',old.due_on)::date); end if;
 end if;
 for financial_month in select distinct m from unnest(months) m order by m loop
  perform pg_advisory_xact_lock(hashtextextended('month-'||financial_month,0));
  if exists(select 1 from public.monthly_closings where month=financial_month) then raise exception 'MONTH_CLOSED'; end if;
 end loop;
 return new;
end $$;
revoke all on function private.protect_obligation_month() from public,anon,authenticated;
create trigger subscription_month_guard before insert on public.subscriptions
 for each row execute function private.protect_obligation_month();
create trigger expense_obligation_month_guard before insert or update on public.expenses
 for each row execute function private.protect_obligation_month();
