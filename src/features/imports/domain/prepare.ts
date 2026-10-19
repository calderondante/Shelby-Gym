import { parseMoney } from "@/features/gym/domain/money";
import {
  importedClient,
  normalize,
  type Cell,
  type Column,
  type Mapping,
  type ImportClient,
} from "./contracts";
export function excelDate(value: Cell): string | null {
  const text = String(value ?? "").trim();
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const result = parts
    ? `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
    : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) return null;
  const date = new Date(`${result}T12:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === result
    ? result
    : null;
}
export function excelMoney(value: Cell): number | null {
  if (typeof value === "number") return parseMoney(String(value));
  const text = String(value ?? "")
    .trim()
    .replace(/^\$\s*/, "");
  // Argentine grouping is accepted only when unambiguous (1.234,56 or 1.234).
  return parseMoney(
    /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)
      ? text.replaceAll(".", "")
      : text,
  );
}
export function prepareImport(
  data: Cell[][],
  mapping: Mapping,
  activities: Record<string, string>,
  ageDate: string,
) {
  const clients = new Map<string, ImportClient>();
  const issues: { row: number; message: string }[] = [];
  const fail = (row: number, message: string) => issues.push({ row, message });
  if (data.length > 1001)
    return {
      clients: [],
      issues: [
        {
          row: 1,
          message:
            "El límite es de 1.000 filas por archivo. Dividilo por clientes completos.",
        },
      ],
    };
  data.slice(1).forEach((cells, index) => {
    const row = index + 2;
    if (cells.every((c) => c === null || String(c).trim() === "")) return;
    const value = (key: Column): Cell =>
      mapping[key] < 0 ? null : (cells[mapping[key]] ?? null);
    const text = (key: Column) => String(value(key) ?? "").trim();
    const external_id = text("external_id");
    if (!external_id || !text("name")) {
      fail(row, "ID de cliente y nombre son obligatorios.");
      return;
    }
    const age = text("age_years") === "" ? null : Number(text("age_years"));
    const profile = {
      external_id,
      name: text("name"),
      phone: text("phone"),
      email: text("email"),
      age_years: age,
      age_as_of: age === null ? null : ageDate,
    };
    let client = clients.get(external_id);
    if (!client) {
      client = { row, ...profile, periods: [] };
      clients.set(external_id, client);
    } else if (
      Object.entries(profile).some(
        ([key, v]) => client![key as keyof typeof profile] !== v,
      )
    ) {
      fail(row, "Los datos del mismo cliente no coinciden entre filas.");
      return;
    }
    if (!text("activity")) {
      if (
        [
          "period_id",
          "starts_on",
          "ends_on",
          "total",
          "balance",
          "payment_id",
          "amount",
          "method",
          "payment_date",
        ].some((k) => text(k as Column) !== "")
      )
        fail(row, "Hay datos de cuota o pago sin actividad.");
      return;
    }
    const activity_id = activities[text("activity")];
    if (!activity_id) {
      fail(row, `Asigná la actividad “${text("activity")}”.`);
      return;
    }
    const starts_on = excelDate(value("starts_on")),
      ends_on = excelDate(value("ends_on"));
    const total_cents = excelMoney(value("total")),
      balance_cents = excelMoney(value("balance"));
    if (
      !text("period_id") ||
      !starts_on ||
      !ends_on ||
      total_cents === null ||
      balance_cents === null
    ) {
      fail(
        row,
        "Cada cuota necesita ID, inicio, vencimiento, importe histórico y saldo (0 si está pagada).",
      );
      return;
    }
    if (
      ends_on <= starts_on ||
      total_cents <= 0 ||
      balance_cents > total_cents
    ) {
      fail(
        row,
        "Revisá las fechas y que el saldo no supere la cuota histórica.",
      );
      return;
    }
    const periodData = {
      external_id: text("period_id"),
      activity_id,
      starts_on,
      ends_on,
      total_cents,
      balance_cents,
    };
    let period = client.periods.find(
      (p) => p.external_id === periodData.external_id,
    );
    if (!period) {
      period = { row, ...periodData, payments: [] };
      client.periods.push(period);
    } else if (
      Object.entries(periodData).some(
        ([k, v]) => period![k as keyof typeof periodData] !== v,
      )
    ) {
      fail(row, "La misma cuota tiene condiciones diferentes entre filas.");
      return;
    }
    if (
      !["payment_id", "payment_date", "method", "amount"].some(
        (k) => text(k as Column) !== "",
      )
    )
      return;
    const date = excelDate(value("payment_date")),
      amount = excelMoney(value("amount"));
    const methods: Record<string, "cash" | "transfer" | "mercado_pago"> = {
      efectivo: "cash",
      cash: "cash",
      transferencia: "transfer",
      transfer: "transfer",
      "mercado pago": "mercado_pago",
      mercadopago: "mercado_pago",
      mercado_pago: "mercado_pago",
      mp: "mercado_pago",
    };
    const method = methods[normalize(text("method"))];
    if (
      !text("payment_id") ||
      !date ||
      !method ||
      amount === null ||
      amount <= 0
    ) {
      fail(row, "El pago necesita ID, fecha, medio e importe positivo.");
      return;
    }
    let payment = period.payments.find(
      (p) => p.external_id === text("payment_id"),
    );
    if (!payment) {
      payment = { external_id: text("payment_id"), date, entries: [] };
      period.payments.push(payment);
    }
    if (
      payment.date !== date ||
      payment.entries.some((e) => e.method === method)
    ) {
      fail(
        row,
        "Pago duplicado o fecha inconsistente. Para un pago mixto, usá el mismo ID y distintos medios.",
      );
      return;
    }
    payment.entries.push({ method, amount });
  });
  for (const c of clients.values()) {
    if (!importedClient.safeParse(c).success)
      fail(
        c.row,
        "Revisá edad (0–120), correo, longitudes e importes del cliente.",
      );
    for (const p of c.periods) {
      const paid = p.payments.reduce(
        (a, p) => a + p.entries.reduce((b, e) => b + e.amount, 0),
        0,
      );
      if (paid > p.total_cents - p.balance_cents)
        fail(
          p.row,
          "Los pagos detallados superan lo abonado según cuota y saldo.",
        );
    }
  }
  if (clients.size > 500)
    fail(1, "El límite es de 500 clientes por importación.");
  if (!clients.size && !issues.length)
    fail(
      1,
      "La hoja no tiene clientes. Agregá filas debajo de los encabezados.",
    );
  return { clients: [...clients.values()], issues };
}
