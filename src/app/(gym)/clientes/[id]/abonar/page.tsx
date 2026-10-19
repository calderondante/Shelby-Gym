import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { PaymentForm } from "@/features/gym/components/payment-form";
import { getCustomer } from "@/features/gym/server/data";
import { money } from "@/features/gym/domain/money";
import { dateLabel } from "@/features/gym/domain/dates";
export const metadata = { title: "Registrar abono" };
export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cuota?: string }>;
}) {
  const [{ id }, { cuota }] = await Promise.all([params, searchParams]);
  const { customer, subscriptions } = await getCustomer(id);
  const s = subscriptions.find((s) => s.id === cuota);
  if (!s || !s.id || !s.currency || (s.balance_cents ?? 0) <= 0) notFound();
  return (
    <>
      <PageHeading
        eyebrow={customer.name}
        title="Registrar abono"
        description={`${s.activity_name} · vence ${dateLabel(s.ends_on!)}`}
        back={{ href: `/clientes/${id}`, label: "Perfil del cliente" }}
      />
      <div className="balance-callout">
        <span>Saldo de esta cuota</span>
        <strong>{money(s.balance_cents!, s.currency)}</strong>
      </div>
      <PaymentForm
        customerId={id}
        subscriptionId={s.id}
        requestId={randomUUID()}
        balance={s.balance_cents!}
        currency={s.currency}
      />
    </>
  );
}
