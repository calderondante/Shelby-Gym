import { describe, expect, it } from "vitest";
import { paperRecordSchema } from "@/features/gym/domain/paper-registration";
const base = {
  requestId: "957e4c70-64d9-4f1c-8b74-bc6a3fcc651a",
  activityId: "957e4c70-64d9-4f1c-8b74-bc6a3fcc651b",
  activityRevision: 1,
  unit: "months",
  startsOn: "2026-08-11",
  endsOn: "2026-09-11",
  total: "25000",
  paid: "18000",
  usedClasses: 0,
  payments: [],
};
const schema = paperRecordSchema("2026-10-26");
describe("registro manual desde papel", () => {
  it("acepta un vencido y conserva monto original y saldo, sin exigir un abono nuevo", () => {
    const parsed = schema.parse(base);
    expect(parsed.total).toBe(2500000);
    expect(parsed.paid).toBe(1800000);
    expect(parsed.payments).toEqual([]);
    expect(schema.parse({ ...base, paid: "0" }).paid).toBe(0);
  });
  it("acepta una cuota vigente iniciada antes y no fechas de inicio futuras", () => {
    expect(
      schema.safeParse({
        ...base,
        startsOn: "2026-10-11",
        endsOn: "2026-11-11",
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...base,
        startsOn: "2026-10-27",
        endsOn: "2026-11-27",
      }).success,
    ).toBe(false);
  });
  it("permite varios pagos anteriores repartidos y rechaza detalle mayor a lo abonado", () => {
    const payments = [
      {
        date: "2026-08-11",
        entries: [
          { method: "cash", amount: 500000 },
          { method: "transfer", amount: 700000 },
        ],
      },
      {
        date: "2026-08-20",
        entries: [{ method: "mercado_pago", amount: 300000 }],
      },
    ];
    expect(schema.parse({ ...base, payments }).payments).toHaveLength(2);
    expect(schema.safeParse({ ...base, paid: "10000", payments }).success).toBe(
      false,
    );
  });
  it("bloquea sobrepagos, vencimientos imposibles y pagos futuros", () => {
    expect(schema.safeParse({ ...base, paid: "30000" }).success).toBe(false);
    expect(schema.safeParse({ ...base, endsOn: base.startsOn }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        ...base,
        payments: [
          { date: "2026-10-27", entries: [{ method: "cash", amount: 100 }] },
        ],
      }).success,
    ).toBe(false);
  });
  it("distingue un pack sin fecha de vencimiento y con clases anteriores", () => {
    const pack = { ...base, unit: "sessions", endsOn: "", usedClasses: 2 };
    expect(schema.parse(pack).usedClasses).toBe(2);
    expect(schema.safeParse({ ...pack, endsOn: "2026-11-11" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...base, usedClasses: 1 }).success).toBe(false);
  });
  it("rechaza medios duplicados y cantidades sin centavos válidos", () => {
    expect(schema.safeParse({ ...base, total: "25000,001" }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        ...base,
        payments: [
          {
            date: "2026-08-11",
            entries: [
              { method: "cash", amount: 1 },
              { method: "cash", amount: 2 },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
