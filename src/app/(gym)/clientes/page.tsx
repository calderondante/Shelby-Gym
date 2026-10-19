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
import { getBirthdayRaffle } from "@/features/gym/server/raffle";
import { RaffleDrawForm } from "@/features/gym/components/raffle-draw-form";
import { validMonth } from "@/features/gym/domain/ledger-calendar";
import { requireSettings, requireStaff } from "@/features/gym/server/session";
import { money } from "@/features/gym/domain/money";
import { dateLabel, todayIn } from "@/features/gym/domain/dates";
export const metadata = { title: "Clientes" };
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string; mes?: string }>;
}) {
  const { staff } = await requireStaff();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const filter = ["deuda", "aldia", "vencidas", "mas30", "bajas", "retirados", "cumpleanos"].includes(params.estado ?? "")
    ? params.estado!
    : "todos";
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(params.pagina) || 1)),
  );
  const settings = await requireSettings();
  const today = todayIn(settings.time_zone);
  const raffleMonth = validMonth(params.mes) && Number(params.mes.slice(0, 4)) >= 2000 ? params.mes : today.slice(0, 7);
  const [{ customers, count }, raffle] = await Promise.all([
    filter === "cumpleanos" ? Promise.resolve({ customers: [], count: 0 }) : getCustomers(q, filter, page),
    filter === "cumpleanos" ? getBirthdayRaffle(raffleMonth, settings.time_zone, q) : Promise.resolve(null),
  ]);
  const cutoff = new Date(`${today}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const thirtyDaysAgo = cutoff.toISOString().slice(0, 10);
  function href(estado: string, pagina = 1) {
    return `/clientes?${new URLSearchParams({ q, estado, pagina: String(pagina), ...(estado === "cumpleanos" ? { mes: raffleMonth } : {}) })}`;
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
              ["cumpleanos", "Cumpleaños"],
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
        {raffle ? <section className="raffle-section" aria-label="Sorteo de cumpleaños">
          <div className="raffle-month-heading">
            <div><span className="eyebrow">SORTEO {raffleMonth.slice(0, 4)}</span><h2>Cumpleaños de {new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(new Date(`${raffleMonth}-15T12:00:00Z`))}</h2></div>
            <form action="/clientes" className="raffle-month-form">
              <input type="hidden" name="estado" value="cumpleanos" />
              <input type="hidden" name="q" value={q} />
              <label htmlFor="raffleMonth">Elegir mes del sorteo</label>
              <input id="raffleMonth" name="mes" type="month" defaultValue={raffleMonth} min="2000-01" max="2100-12" required />
              <button type="submit">Ver mes</button>
            </form>
          </div>
          <p className="raffle-rule">Sólo participan quienes ya estaban registrados al cierre y cuya cuota no llevaba más de 30 días vencida. Se guarda únicamente el mes de cumpleaños.</p>
          {raffle.drawOn ? <p className="raffle-cutoff">Sorteo registrado el {dateLabel(raffle.drawOn)}. Lista calculada para esa fecha.</p>
            : <div className="raffle-cutoff"><p>Vista previa al {dateLabel(raffle.cutoff)}. Registrá la fecha cuando se haga el sorteo para fijar el cierre.</p>{staff.role === "owner" ? <RaffleDrawForm month={raffleMonth} today={today} /> : null}</div>}
          <div className="raffle-list-heading"><h3>Participan</h3><span>{raffle.eligible.length}</span></div>
          {raffle.eligible.length ? <ul className="raffle-client-list">{raffle.eligible.map((customer) => <li key={customer.id}><Link href={`/clientes/${customer.id}`}><strong>{customer.name}</strong><span>{new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, (customer.birth_month ?? 1) - 1, 15)))}</span><ChevronRight size={18} aria-hidden="true" /></Link></li>)}</ul>
            : <p className="raffle-empty">No hay participantes para este mes.</p>}
          <div className="raffle-list-heading"><h3>No participan en este sorteo</h3><span>{raffle.excluded.length}</span></div>
          {raffle.excluded.length ? <ul className="raffle-client-list">{raffle.excluded.map((customer) => <li key={customer.id}><Link href={`/clientes/${customer.id}`}><strong>{customer.name}</strong><span>{customer.reason}</span><ChevronRight size={18} aria-hidden="true" /></Link></li>)}</ul>
            : <p className="raffle-empty">No hay exclusiones.</p>}
          <p className="raffle-rule">Un alta posterior al sorteo puede participar el año próximo si cumple los requisitos entonces.</p>
        </section> : <>
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
        </>}
      </section>
    </>
  );
}
