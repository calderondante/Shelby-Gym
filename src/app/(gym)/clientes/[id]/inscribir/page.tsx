import { randomUUID } from "node:crypto";
import { PageHeading } from "@/components/shared/page-heading";
import { EnrollmentForm } from "@/features/gym/components/enrollment-form";
import { getActivities, getCustomer } from "@/features/gym/server/data";
import { requireSettings } from "@/features/gym/server/session";
import { todayIn } from "@/features/gym/domain/dates";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
export default async function EnrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ customer, subscriptions }, activities, settings] = await Promise.all(
    [getCustomer(id), getActivities(true), requireSettings()],
  );
  const today = todayIn(settings.time_zone);
  const available = activities.filter(
    (a) =>
      !subscriptions.some((s) => s.activity_id === a.id && s.ends_on! > today),
  );
  return (
    <>
      <PageHeading
        eyebrow={customer.name}
        title="Nuevo período o actividad"
        description="El período comienza hoy con el primer abono. Las deudas anteriores se conservan por separado."
        back={{ href: `/clientes/${id}`, label: "Perfil del cliente" }}
      />
      {available.length ? (
        <EnrollmentForm
          activities={available}
          currency={settings.currency}
          today={today}
          requestId={randomUUID()}
          customerId={id}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Suscripciones vigentes</EmptyTitle>
            <EmptyDescription>
              Este cliente ya tiene vigentes todas las actividades disponibles.
              La renovación se habilita al vencer el período actual.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}
