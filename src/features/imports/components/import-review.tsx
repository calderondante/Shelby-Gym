"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/features/gym/domain/money";
import { dateLabel } from "@/features/gym/domain/dates";
import { paymentMethods } from "@/features/gym/validation/contracts";
import type { ImportPayload, ImportReport } from "../domain/contracts";
export function ImportReview({
  payload,
  report,
  activities,
  currency,
  busy,
  confirmed,
  setConfirmed,
  onBack,
  onSave,
}: {
  payload: ImportPayload;
  report: ImportReport;
  activities: { id: string; name: string }[];
  currency: string;
  busy: boolean;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const [page, setPage] = useState(0);
  const periods = payload.clients.flatMap((c) => c.periods) ?? [];
  const balance = periods.reduce((n, p) => n + p.balance_cents, 0);
  const opening = periods.reduce(
    (n, p) =>
      n +
      p.total_cents -
      p.balance_cents -
      p.payments.reduce(
        (a, p) => a + p.entries.reduce((b, e) => b + e.amount, 0),
        0,
      ),
    0,
  );
  return (
    <div className="import-review">
      <span className="eyebrow">02 / ÚLTIMA REVISIÓN</span>
      <h2 data-step-heading tabIndex={-1}>
        Todo claro antes de continuar.
      </h2>
      <p>
        Todavía no guardamos nada. Revisá los datos y confirmá cuando estén
        listos.
      </p>
      <dl className="import-totals">
        <div>
          <dt>Clientes nuevos</dt>
          <dd>{report.created}</dd>
        </div>
        <div>
          <dt>Ya importados · se omiten</dt>
          <dd>{report.skipped}</dd>
        </div>
        <div>
          <dt>Cuotas en el archivo</dt>
          <dd>{report.periods}</dd>
        </div>
        <div>
          <dt>Pagos detallados</dt>
          <dd>{report.payments}</dd>
        </div>
      </dl>
      <div className="import-financial">
        <div>
          <span>Saldo pendiente del archivo</span>
          <strong>{money(balance, currency)}</strong>
        </div>
        <p>
          Importes históricos en {currency}. No se actualizan por inflación.
        </p>
        {opening > 0 ? (
          <p>
            {money(opening, currency)} ya abonados sin detalle se conservarán
            como saldo de apertura, sin inventar fecha ni medio de cobro.
          </p>
        ) : null}
      </div>
      <div
        className="import-preview-list"
        aria-label="Vista previa de clientes"
      >
        {payload.clients.slice(page * 20, (page + 1) * 20).map((c) => (
          <article key={c.external_id}>
            <div>
              <strong>{c.name}</strong>
              <small>
                ID {c.external_id}
                {c.age_years !== null
                  ? ` · ${c.age_years} años al ${c.age_as_of}`
                  : ""}
              </small>
            </div>
            {c.periods.length ? (
              <ul>
                {c.periods.map((p) => (
                  <li key={p.external_id}>
                    <span>
                      {activities.find((a) => a.id === p.activity_id)?.name} ·{" "}
                      {p.starts_on} → {p.ends_on}
                    </span>
                    <span>
                      Cuota {money(p.total_cents, currency)} · Saldo{" "}
                      {money(p.balance_cents, currency)}
                    </span>
                    {p.payments.length ? (
                      <details className="preview-payments">
                        <summary>
                          {p.payments.length} pagos anteriores · ver detalle
                        </summary>
                        {p.payments.map((payment) => (
                          <div key={payment.external_id}>
                            <strong>{dateLabel(payment.date)}</strong>
                            {payment.entries.map((entry) => (
                              <span key={entry.method}>
                                {paymentMethods[entry.method]} ·{" "}
                                {money(entry.amount, currency)}
                              </span>
                            ))}
                          </div>
                        ))}
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <small>Solo perfil · sin cuotas</small>
            )}
          </article>
        ))}
      </div>
      {payload.clients.length > 20 ? (
        <nav
          className="pagination"
          aria-label="Vista previa de clientes por página"
        >
          <Button
            variant="outline"
            disabled={busy || page === 0}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>
            {page + 1} / {Math.ceil(payload.clients.length / 20)}
          </span>
          <Button
            variant="outline"
            disabled={busy || (page + 1) * 20 >= payload.clients.length}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </nav>
      ) : null}
      <label className="import-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          Revisé fechas, precios históricos, pagos y saldos en {currency}.
          Entiendo que se incorporarán juntos y no reemplazarán perfiles
          existentes.
        </span>
      </label>
      <div className="import-actions">
        <Button variant="outline" disabled={busy} onClick={() => onBack()}>
          Volver a los datos
        </Button>
        <Button size="lg" disabled={busy || !confirmed} onClick={onSave}>
          {busy
            ? "Importando…"
            : report.created
              ? `Importar ${report.created} ${report.created === 1 ? "cliente" : "clientes"}`
              : "Finalizar sin duplicar"}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
