import { PageHeading } from "@/components/shared/page-heading";
import { getCustomer, getCustomerEvents, getPayments } from "@/features/gym/server/data";
import { requireSettings } from "@/features/gym/server/session";
import { dateLabel, todayIn } from "@/features/gym/domain/dates";
import { money } from "@/features/gym/domain/money";
import { paymentMethods } from "@/features/gym/validation/contracts";

export const metadata = { title: "Historial del cliente" };

type Entry = { id: string; date: string; title: string; detail: string };

export default async function CustomerHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ customer, subscriptions }, payments, events, settings] = await Promise.all([
    getCustomer(id), getPayments(id), getCustomerEvents(id), requireSettings(),
  ]);
  const civilDate = (value: string) => new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.time_zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
  const entries: Entry[] = [{
    id: "created", date: civilDate(customer.created_at), title: "Perfil creado", detail: "Alta del cliente en Shelby Gym",
  }];
  for (const subscription of subscriptions) {
    entries.push({
      id: `start-${subscription.id}`, date: subscription.starts_on!, title: "Cuota iniciada",
      detail: `${subscription.activity_name} · ${money(subscription.total_cents!, subscription.currency!)} · vence ${dateLabel(subscription.ends_on!)}`,
    });
    if (subscription.ends_on! <= todayIn(settings.time_zone)) {
      const paidByEnd = payments
        .filter((payment) => payment.subscription_id === subscription.id && (payment.occurred_on ?? civilDate(payment.created_at)) <= subscription.ends_on!)
        .flatMap((payment) => payment.payment_entries)
        .reduce((sum, payment) => sum + payment.amount_cents, subscription.opening_paid_cents ?? 0);
      const due = Math.max(0, subscription.total_cents! - paidByEnd);
      entries.push({
        id: `end-${subscription.id}`, date: subscription.ends_on!,
        title: due ? "Cuota vencida con saldo" : "Cuota finalizada",
        detail: due ? `${money(due, subscription.currency!)} pendientes al vencimiento · ${subscription.activity_name}` : `${subscription.activity_name} · sin saldo al vencimiento`,
      });
    }
  }
  for (const payment of payments) {
    const subscription = subscriptions.find((item) => item.id === payment.subscription_id);
    const total = payment.payment_entries.reduce((sum, line) => sum + line.amount_cents, 0);
    entries.push({
      id: `payment-${payment.id}`, date: payment.occurred_on ?? civilDate(payment.created_at),
      title: payment.import_batch_id ? "Abono histórico importado" : "Abono recibido",
      detail: `${money(total, subscription?.currency ?? settings.currency)} · ${payment.payment_entries.map((line) => paymentMethods[line.method as keyof typeof paymentMethods]).join(" + ")} · ${subscription?.activity_name ?? "Actividad"}`,
    });
  }
  for (const event of events) {
    entries.push({
      id: `status-${event.id}`, date: civilDate(event.created_at),
      title: event.event === "retired" ? "Perfil eliminado de la lista" : event.event === "inactive" ? "Baja registrada" : "Cliente reactivado",
      detail: `Registrado por ${event.staff?.name ?? "Personal"}`,
    });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const groups = Object.groupBy(entries, (entry) => entry.date);
  return <>
    <PageHeading eyebrow={customer.name} title="Historial" description="Movimientos por día, con el importe original de cada cuota y los abonos registrados." back={{ href: `/clientes/${id}`, label: "Perfil del cliente" }} />
    <div className="customer-timeline">
      {Object.entries(groups).map(([day, items]) => <section key={day}>
        <h2>{dateLabel(day)}</h2>
        <ol>{items?.map((entry) => <li key={entry.id}>
          <strong>{entry.title}</strong><span>{entry.detail}</span>
        </li>)}</ol>
      </section>)}
    </div>
  </>;
}
