import { randomUUID } from "node:crypto";
import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { PaperRegistrationForm } from "@/features/gym/components/paper-registration-form";
import { requireStaff } from "@/features/gym/server/session";
import { redirect } from "next/navigation";
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
export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ origen?: string }>;
}) {
  const [{ staff }, params] = await Promise.all([requireStaff(), searchParams]);
  const paper = params.origen === "papel";
  if (paper && staff.role !== "owner") redirect("/clientes/nuevo");
  const [activities, settings] = await Promise.all([
    getActivities(!paper),
    requireSettings(),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="UNA NUEVA HISTORIA"
        title="Nuevo cliente"
        description={
          paper
            ? "Pasá la situación del papel con sus fechas, importe original y saldo, aunque la cuota haya vencido."
            : "Datos, actividad y primer abono. Sin ir de una pantalla a otra."
        }
        back={{ href: "/clientes", label: "Clientes" }}
      />
      {staff.role === "owner" ? (
        <nav className="operation-tabs" aria-label="Tipo de registro">
          <Link
            href="/clientes/nuevo"
            aria-current={!paper ? "page" : undefined}
            className={buttonVariants({
              variant: !paper ? "default" : "outline",
            })}
          >
            Alta de hoy
          </Link>
          <Link
            href="/clientes/nuevo?origen=papel"
            aria-current={paper ? "page" : undefined}
            className={buttonVariants({
              variant: paper ? "default" : "outline",
            })}
          >
            Cargar desde papel
          </Link>
        </nav>
      ) : null}
      {activities.length ? (
        paper ? (
          <PaperRegistrationForm
            activities={activities}
            currency={settings.currency}
            today={todayIn(settings.time_zone)}
            requestId={randomUUID()}
          />
        ) : (
          <EnrollmentForm
            activities={activities}
            currency={settings.currency}
            today={todayIn(settings.time_zone)}
            requestId={randomUUID()}
          />
        )
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
