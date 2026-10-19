import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { getActivities } from "@/features/gym/server/data";
import { requireSettings, requireStaff } from "@/features/gym/server/session";
import { money } from "@/features/gym/domain/money";
export const metadata = { title: "Actividades" };
export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const [activities, settings, { staff }, params] = await Promise.all([
    getActivities(),
    requireSettings(),
    requireStaff(),
    searchParams,
  ]);
  return (
    <>
      <PageHeading
        eyebrow="LA PROPUESTA DEL GIMNASIO"
        title="Actividades"
        description="Tus disciplinas, combinaciones y precios. Listos para asignar."
        action={
          staff.role === "owner" ? (
            <Link
              href="/actividades/nueva"
              className={buttonVariants({ size: "lg" })}
            >
              <Plus data-icon="inline-start" />
              Nueva actividad
            </Link>
          ) : undefined
        }
      />
      {params.guardado ? (
        <Alert role="status" className="mb-6">
          <AlertTitle>
            Actividad guardada. Las cuotas existentes conservan sus condiciones.
          </AlertTitle>
        </Alert>
      ) : null}
      {activities.length ? (
        <ul className="activities-list">
          {activities.map((a) => (
            <li key={a.id} className="activity-item">
              <div className="activity-main">
                <div className="activity-title">
                  <h2>{a.name}</h2>
                  {!a.active ? (
                    <Badge variant="outline">No disponible</Badge>
                  ) : null}
                  {a.offer_price_cents ? (
                    <Badge variant="secondary">{a.offer_label}</Badge>
                  ) : null}
                </div>
                <p className="muted">
                  {a.description || "Sin detalles adicionales"}
                </p>
                <span className="activity-duration">
                  {a.duration_count}{" "}
                  {a.duration_unit === "months"
                    ? a.duration_count === 1
                      ? "mes calendario"
                      : "meses calendario"
                    : a.duration_count === 1
                      ? "día"
                      : "días"}
                </span>
              </div>
              <div className="activity-price">
                <strong>
                  {money(
                    a.offer_price_cents ?? a.price_cents,
                    settings.currency,
                  )}
                </strong>
                {a.offer_price_cents ? (
                  <del>{money(a.price_cents, settings.currency)}</del>
                ) : (
                  <small>Por período</small>
                )}
              </div>
              {staff.role === "owner" ? (
                <Link
                  href={`/actividades/${a.id}`}
                  className={buttonVariants({ variant: "outline" })}
                  aria-label={`Editar ${a.name}`}
                >
                  Editar
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Dale forma a tu gimnasio</EmptyTitle>
            <EmptyDescription>
              {staff.role === "owner"
                ? "Creá una actividad con su precio y duración. También podés armar planes que combinen disciplinas."
                : "El dueño todavía no creó actividades. Cuando estén disponibles, podrás asignarlas a los clientes."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}
