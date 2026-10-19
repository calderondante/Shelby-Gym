import { randomUUID } from "node:crypto";
import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { EnrollmentForm } from "@/features/gym/components/enrollment-form";
import { getActivities } from "@/features/gym/server/data";
import { requireSettings } from "@/features/gym/server/session";
import { todayIn } from "@/features/gym/domain/dates";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
export const metadata = { title: "Nuevo cliente" };
export default async function NewCustomerPage() {
  const [activities, settings] = await Promise.all([
    getActivities(true),
    requireSettings(),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="UNA NUEVA HISTORIA"
        title="Nuevo cliente"
        description="Datos, actividad y primer abono. Sin ir de una pantalla a otra."
        back={{ href: "/clientes", label: "Clientes" }}
      />
      {activities.length ? (
        <EnrollmentForm
          activities={activities}
          currency={settings.currency}
          today={todayIn(settings.time_zone)}
          requestId={randomUUID()}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Primero, una actividad</EmptyTitle>
            <EmptyDescription>
              El dueño necesita crear al menos una actividad disponible antes de
              registrar una suscripción.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/actividades" className={buttonVariants()}>
              Ir a Actividades
            </Link>
          </EmptyContent>
        </Empty>
      )}
    </>
  );
}
