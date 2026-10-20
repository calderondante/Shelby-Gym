create or replace function public.close_gym_month(p_month date) returns void
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; tz text; local_today date; next_month date;
begin
 if private.staff_role() is distinct from 'owner' then raise exception 'FORBIDDEN'; end if;
 select time_zone into tz from public.gym_settings where id;
 local_today:=(now() at time zone tz)::date;
 if p_month is null or p_month<>date_trunc('month',p_month)::date or p_month>=date_trunc('month',local_today)::date then raise exception 'INVALID_MONTH'; end if;
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
 'pendingExpenses',coalesce((select sum(e.total_cents-coalesce((select sum(case when p.reversal_of is null then p.amount_cents else -p.amount_cents end) from public.expense_payments p where p.expense_id=e.id and p.occurred_on<next_month),0)) from public.expenses e where e.due_on<next_month),0),
 'pendingTotal',coalesce((select sum(balance_cents) from debts),0),
 'pendingMonthly',coalesce((select sum(balance_cents) from debts where starts_on>=p_month),0),
 'pendingMemberships',coalesce((select sum(balance_cents) from debts where starts_on>=p_month and duration_unit<>'sessions'),0),
 'pendingClasses',coalesce((select sum(balance_cents) from debts where starts_on>=p_month and duration_unit='sessions'),0),
 'payments',coalesce((select jsonb_agg(to_jsonb(p)) from payments p where day>=p_month and day<next_month),'[]'::jsonb),
 'expenses',coalesce((select jsonb_agg(to_jsonb(c)) from costs c),'[]'::jsonb),
 'debts',coalesce((select jsonb_agg(to_jsonb(d)) from debts d where balance_cents>0),'[]'::jsonb)) into snapshot;
 insert into public.monthly_closings(month,snapshot,created_by) values(p_month,snapshot,auth.uid());
end $$;

-- Historical imports into a conserved financial month need an explicit correction workflow.
create function private.protect_closed_payment_month() returns trigger
language plpgsql security definer set search_path='' as $$
declare tz text; civil date;
begin
 select time_zone into tz from public.gym_settings where id;
 civil:=coalesce(new.occurred_on,(new.created_at at time zone tz)::date);
 if exists(select 1 from public.monthly_closings where month=date_trunc('month',civil)::date) then raise exception 'MONTH_CLOSED'; end if;
 return new;
end $$;
revoke all on function private.protect_closed_payment_month() from public,anon,authenticated;
create trigger payment_month_guard before insert on public.payment_batches for each row execute function private.protect_closed_payment_month();
