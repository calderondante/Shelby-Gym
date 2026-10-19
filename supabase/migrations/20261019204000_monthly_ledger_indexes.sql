-- Historial mensual: los pagos importados se buscan por su fecha original;
-- los movimientos nuevos por la fecha de registro, en horario del gimnasio.
create index payment_batches_live_created_idx
  on public.payment_batches (created_at desc, id)
  where occurred_on is null;

create index payment_batches_historical_day_idx
  on public.payment_batches (occurred_on desc, id)
  where occurred_on is not null;

create index subscriptions_live_created_idx
  on public.subscriptions (created_at desc, id)
  where import_batch_id is null;

create index customers_created_at_idx
  on public.customers (created_at desc, id);

create index customer_events_created_at_idx
  on public.customer_events (created_at desc, id);
