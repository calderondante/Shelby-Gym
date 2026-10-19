import { describe, expect, it } from "vitest";
import { endDate, todayIn, validity } from "../src/features/gym/domain/dates";
import { parseMoney } from "../src/features/gym/domain/money";
import {
  paymentSchema,
  activitySchema,
} from "../src/features/gym/validation/contracts";
describe("períodos civiles", () => {
  it("respeta el aniversario, el fin de mes y los años bisiestos", () => {
    expect(endDate("2026-02-11", 1, "months")).toBe("2026-03-11");
    expect(endDate("2026-01-31", 1, "months")).toBe("2026-02-28");
    expect(endDate("2028-01-31", 1, "months")).toBe("2028-02-29");
    expect(endDate("2028-02-29", 12, "months")).toBe("2029-02-28");
    expect(endDate("2026-12-28", 7, "days")).toBe("2027-01-04");
  });
  it("usa la fecha del gimnasio, no la zona del servidor", () => {
    expect(
      todayIn(
        "America/Argentina/Buenos_Aires",
        new Date("2026-02-12T01:00:00Z"),
      ),
    ).toBe("2026-02-11");
    expect(validity("2026-02-11", "2026-03-11", "2026-03-11")).toBe("Vencida");
  });
});
describe("importes y pagos", () => {
  it("convierte exactamente centavos y rechaza importes ambiguos", () => {
    expect(parseMoney("0,29")).toBe(29);
    expect(parseMoney("15000.5")).toBe(1500050);
    for (const value of [
      "-1",
      "1e4",
      "1.000,50",
      "1.001",
      "NaN",
      "Infinity",
      "",
    ])
      expect(parseMoney(value)).toBeNull();
  });
  it("permite repartir un abono y rechaza pagos nulos", () => {
    expect(
      paymentSchema.parse({ cash: "50", transfer: "50", mercado_pago: "0" }),
    ).toEqual({ cash: 5000, transfer: 5000, mercado_pago: 0 });
    expect(
      paymentSchema.safeParse({ cash: "0", transfer: "0", mercado_pago: "0" })
        .success,
    ).toBe(false);
  });
  it("impide ofertas sin nombre o superiores al precio base", () => {
    const activity = {
      name: "Plan",
      description: "",
      price: "100",
      offerPrice: "120",
      offerLabel: "Promo",
      duration: 1,
      unit: "months",
      active: true,
    };
    expect(activitySchema.safeParse(activity).success).toBe(false);
    expect(
      activitySchema.safeParse({ ...activity, offerPrice: "80" }).success,
    ).toBe(true);
  });
});
