import Link from "next/link";
import { Plus, ChevronRight, Search, FileSpreadsheet } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { getCustomers } from "@/features/gym/server/data";
import { requireSettings, requireStaff } from "@/features/gym/server/session";
import { money } from "@/features/gym/domain/money";
import { dateLabel, todayIn } from "@/features/gym/domain/dates";
export const metadata = { title: "Clientes" };
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string }>;
}) {
  const { staff } = await requireStaff();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const filter = ["deuda", "aldia", "vencidas", "mas30", "bajas", "retirados"].includes(params.estado ?? "")
    ? params.estado!
    : "todos";
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(params.pagina) || 1)),
  );
  const [settings, { customers, count }] = await Promise.all([
    requireSettings(),
    getCustomers(q, filter, page),
  ]);
  const cutoff = new Date(`${todayIn(settings.time_zone)}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const thirtyDaysAgo = cutoff.toISOString().slice(0, 10);
  function href(estado: string, pagina = 1) {
    return `/clientes?${new URLSearchParams({ q, estado, pagina: String(pagina) })}`;
  }
  return (
    <>
      <PageHeading
        eyebrow="TU COMUNIDAD"
        title="Clientes"
        description="Cada cliente, su actividad y su cuota. Todo a mano."
        action={
          <div className="heading-actions">
            {staff.role === "owner" ? (
              <Link
                href="/clientes/importar"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <FileSpreadsheet size={17} aria-hidden="true" />
                Importar Excel
              </Link>
            ) : null}
            <Link
              href="/clientes/nuevo"
              className={buttonVariants({ size: "lg" })}
            >
              <Plus data-icon="inline-start" />
              Nuevo cliente
            </Link>
          </div>
        }
      />
      <section aria-label="Buscar y filtrar clientes">
        <div className="list-toolbar">
          <form action="/clientes" className="search-form">
            <label className="sr-only" htmlFor="q">
              Buscar por nombre
            </label>
            <Input
              id="q"
              name="q"
              placeholder="Buscar por nombre…"
              defaultValue={q}
              maxLength={100}
            />
            <input type="hidden" name="estado" value={filter} />
            <Button type="submit" variant="secondary" aria-label="Buscar">
              <Search data-icon="inline-start" />
            </Button>
          </form>
          <nav className="filter-links" aria-label="Estado de cuota">
            {[
              ["todos", "Todos"],
              ["deuda", "Con saldo"],
              ["aldia", "Al día"],
              ["vencidas", "Vencidas"],
              ["mas30", "+30 días"],
              ["bajas", "Bajas"],
              ["retirados", "Eliminados"],
            ].map(([value, label]) => (
              <Link
                href={href(value)}
                key={value}
                aria-current={filter === value ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="list-meta">
          <span>
            {count} {count === 1 ? "cliente" : "clientes"}
            {q ? ` para “${q}”` : ""}
          </span>
          <span>Vigencia y saldo, por separado</span>
        </div>
        {customers.length ? (
          <div className="customer-list">
            <div className="list-columns" aria-hidden="true">
              <span>CLIENTE / ACTIVIDAD</span>
              <span>SUSCRIPCIÓN</span>
              <span>CUOTA</span>
              <span />
            </div>
            <ul>
              {customers.map((c) => (
                <li key={c.id}>
                  <Link className="customer-row" href={`/clientes/${c.id}`}>
                    <div className="customer-identity">
                      <span className="initials" aria-hidden="true">
                        {(c.name ?? "")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <div>
                        <strong>{c.name}</strong>
                        <span>{c.activity_names || "Sin actividad"}</span>
                      </div>
                    </div>
                    <div className="customer-validity">
                      <Badge variant={c.has_active ? "secondary" : "outline"}>
                        {c.status === "retired" ? "Eliminado" : c.status === "inactive" ? "De baja" : c.has_active
                          ? "Vigente"
                          : c.last_end
                            ? c.last_end <= thirtyDaysAgo ? "Vencida +30 días" : "Vencida"
                            : "Sin actividad"}
                      </Badge>
                      <small>
                        {c.last_end
                          ? `Hasta ${dateLabel(c.last_end)}`
                          : "Sin período registrado"}
                      </small>
                    </div>
                    <div className="customer-balance">
                      {(c.balance_cents ?? 0) > 0 ? (
                        <>
                          <strong className="debt-amount">
                            {money(c.balance_cents ?? 0, settings.currency)}
                          </strong>
                          <small>Pendiente</small>
                        </>
                      ) : (
                        <>
                          <strong>Al día</strong>
                          <small>Sin saldo pendiente</small>
                        </>
                      )}
                    </div>
                    <ChevronRight
                      className="row-chevron"
                      aria-hidden="true"
                      size={18}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty className="list-empty">
            <EmptyHeader>
              <EmptyTitle>
                {q || filter !== "todos"
                  ? "No hay coincidencias"
                  : "Tu comunidad empieza acá"}
              </EmptyTitle>
              <EmptyDescription>
                {q || filter !== "todos"
                  ? "Probá otro nombre o cambiá el filtro."
                  : "Creá la primera actividad y registrá a tu primer cliente."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href={q || filter !== "todos" ? "/clientes" : "/clientes/nuevo"}
                className={buttonVariants({ variant: "secondary" })}
              >
                {q || filter !== "todos"
                  ? "Ver todos los clientes"
                  : "Registrar un cliente"}
              </Link>
            </EmptyContent>
          </Empty>
        )}
        {count > 30 ? (
          <nav className="pagination" aria-label="Páginas de clientes">
            {page > 1 ? (
              <Link
                href={href(filter, page - 1)}
                className={buttonVariants({ variant: "outline" })}
              >
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span>
              Página {page} de {Math.ceil(count / 30)}
            </span>
            {page * 30 < count ? (
              <Link
                href={href(filter, page + 1)}
                className={buttonVariants({ variant: "outline" })}
              >
                Siguiente
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </>
  );
}
