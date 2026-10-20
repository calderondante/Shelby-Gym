import { requireSettings } from "@/features/gym/server/session";
import { getReport } from "@/features/gym/server/reports";
import { validMonth } from "@/features/gym/domain/ledger-calendar";
import { csvRows } from "@/features/gym/domain/operations";
import { paymentMethods } from "@/features/gym/validation/contracts";
export async function GET(request: Request) {
  const settings = await requireSettings();
  const url = new URL(request.url),
    month = url.searchParams.get("mes");
  if (!validMonth(month ?? undefined))
    return new Response("Mes inválido", { status: 400 });
  const { totals: t, frozen } = await getReport(
    month!,
    settings.time_zone,
    settings.currency,
    url.searchParams.get("version") === "cierre",
  );
  const rows: (string | number)[][] = [
    ["Shelby Gym", month!, frozen ? "Cierre conservado" : "Valores actuales"],
    ["Generado", new Date().toISOString(), settings.time_zone],
    ["Moneda", settings.currency],
    [],
    ["Indicador", "Importe ARS"],
    ["Cobrado", t.received / 100],
    ["Gastado", t.spent / 100],
    ["Neto", (t.received - t.spent) / 100],
    ["Pendiente cuotas del mes", t.pendingMemberships / 100],
    ["Pendiente clases del mes", t.pendingClasses / 100],
    ["Pendiente total", t.pendingTotal / 100],
    ["Gastos pendientes", t.pendingExpenses / 100],
    [],
    ["Fecha", "Tipo", "Cliente / concepto", "Actividad / medio", "Importe ARS"],
  ];
  rows.push(
    ...t.payments.map((p) => [
      p.day,
      "Cobro",
      p.name,
      `${p.activity_name} · ${paymentMethods[p.method as keyof typeof paymentMethods]}`,
      p.amount_cents / 100,
    ]),
  );
  rows.push(
    ...t.expenses.flatMap((e) =>
      e.entries.map((line) => [
        e.occurred_on,
        e.reversal_of ? "Corrección de gasto" : "Gasto",
        e.title,
        paymentMethods[line.method],
        (line.amount / 100) * (e.reversal_of ? 1 : -1),
      ]),
    ),
  );
  rows.push(
    [],
    ["Mes de origen", "Cliente", "Actividad", "Pendiente ARS"],
    ...t.debts.map((d) => [
      d.starts_on.slice(0, 7),
      d.name,
      d.activity_name,
      d.balance_cents / 100,
    ]),
  );
  return new Response(csvRows(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shelby-${month}-${frozen ? "cierre" : "actual"}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
