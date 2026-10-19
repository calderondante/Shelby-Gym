import { describe, expect, it } from "vitest";
import { daysOfMonth, paymentDay, shiftMonth, sumMethods, validMonth } from "../src/features/gym/domain/ledger-calendar";

describe("historial mensual", () => {
  it("incluye el 29 de febrero y cruza de diciembre a enero", () => {
    expect(daysOfMonth("2028-02")).toHaveLength(29);
    expect(daysOfMonth("2027-02")).toHaveLength(28);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(validMonth("2026-13")).toBe(false);
  });

  it("atribuye un pago importado al día original, no al día de importación", () => {
    expect(paymentDay({
      occurred_on: "2026-02-11",
      created_at: "2026-10-19T13:00:00Z",
    }, "America/Argentina/Buenos_Aires")).toBe("2026-02-11");
    expect(paymentDay({
      occurred_on: null,
      created_at: "2026-10-20T01:00:00Z",
    }, "America/Argentina/Buenos_Aires")).toBe("2026-10-19");
  });

  it("suma una operación mixta una vez en cada medio, sin sumar el precio de la cuota", () => {
    const totals = sumMethods([
      { payment_entries: [
        { method: "transfer", amount_cents: 250_000 },
        { method: "cash", amount_cents: 250_000 },
      ] },
      { payment_entries: [{ method: "mercado_pago", amount_cents: 100_000 }] },
    ]);
    expect(totals).toEqual({ transfer: 250_000, mercado_pago: 100_000, cash: 250_000 });
    expect(Object.values(totals).reduce((sum, amount) => sum + amount, 0)).toBe(600_000);
  });
});
