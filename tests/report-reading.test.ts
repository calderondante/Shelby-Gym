import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Closing } from "@/features/gym/domain/operations";
vi.mock("server-only", () => ({}));
const reads = vi.hoisted(() => ({
  ledger: vi.fn(),
  costs: vi.fn(),
  closing: vi.fn(),
}));
vi.mock("@/features/gym/server/monthly-ledger", () => ({
  getMonthlyLedger: reads.ledger,
}));
vi.mock("@/features/gym/server/operations", () => ({
  getExpenseData: reads.costs,
  getMonthlyClosing: reads.closing,
}));
import { getReport } from "@/features/gym/server/reports";
const snapshot: Closing = {
  month: "2020-01",
  received: 25000,
  spent: 4000,
  pendingTotal: 8000,
  pendingMonthly: 5000,
  pendingMemberships: 3000,
  pendingClasses: 2000,
  pendingExpenses: 700,
  payments: [],
  expenses: [],
  debts: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  reads.closing.mockResolvedValue(null);
  reads.ledger.mockResolvedValue({
    payments: [
      {
        occurred_on: "2020-01-15",
        created_at: "2020-01-15T15:00:00Z",
        payment_entries: [
          { method: "cash", amount_cents: 3000 },
          { method: "transfer", amount_cents: 2000 },
        ],
        subscriptions: {
          activity_name: "Musculación",
          customers: { name: "Ana" },
        },
      },
    ],
    pendingCents: 9000,
    monthlyPendingCents: 7000,
    balances: [
      {
        starts_on: "2020-01-12",
        duration_unit: "months",
        balance_cents: 4000,
        customers: { name: "Ana" },
        activity_name: "Musculación",
      },
      {
        starts_on: "2020-01-20",
        duration_unit: "sessions",
        balance_cents: 3000,
        customers: { name: "Bruno" },
        activity_name: "Boxeo",
      },
      {
        starts_on: "2019-12-01",
        duration_unit: "months",
        balance_cents: 2000,
        customers: { name: "Clara" },
        activity_name: "Musculación",
      },
    ],
  });
  reads.costs.mockResolvedValue({
    pending: 1000,
    spent: 1500,
    payments: [
      {
        occurred_on: "2020-01-10",
        expenses: { title: "Luz" },
        amount_cents: 2000,
        reversal_of: null,
        lines: [{ method: "cash", amount: 2000 }],
      },
      {
        occurred_on: "2020-01-11",
        expenses: { title: "Luz" },
        amount_cents: 500,
        reversal_of: "original",
        lines: [{ method: "cash", amount: 500 }],
      },
    ],
  });
});
describe("lecturas financieras selectivas", () => {
  it("un cierre conserva sus cifras sin consultar movimientos actuales", async () => {
    reads.closing.mockResolvedValue({
      totals: snapshot,
      created_at: "2020-02-01T12:00:00Z",
    });
    const report = await getReport(
      "2020-01",
      "America/Argentina/Buenos_Aires",
      "ARS",
      true,
    );
    expect(report.frozen).toBe(true);
    expect(report.totals).toEqual(snapshot);
    expect(reads.ledger).not.toHaveBeenCalled();
    expect(reads.costs).not.toHaveBeenCalled();
  });
  it("versión actual conserva medios combinados, deuda de otros meses y reversión de gasto", async () => {
    reads.closing.mockResolvedValue({ totals: snapshot });
    const report = await getReport(
      "2020-01",
      "America/Argentina/Buenos_Aires",
      "ARS",
      false,
    );
    expect(report.frozen).toBe(false);
    expect(report.totals).toMatchObject({
      received: 5000,
      spent: 1500,
      pendingTotal: 9000,
      pendingMonthly: 7000,
      pendingMemberships: 4000,
      pendingClasses: 3000,
      pendingExpenses: 1000,
    });
    expect(
      report.totals.payments.map((p) => [p.method, p.amount_cents]),
    ).toEqual([
      ["cash", 3000],
      ["transfer", 2000],
    ]);
    expect(report.totals.debts).toHaveLength(3);
    expect(report.totals.expenses[1].reversal_of).toBe("original");
  });
  it("un mes sin cierre ofrece cifras actuales con el mismo desglose", async () => {
    const actual = await getReport(
      "2020-01",
      "America/Argentina/Buenos_Aires",
      "ARS",
      false,
    );
    const fallback = await getReport(
      "2020-01",
      "America/Argentina/Buenos_Aires",
      "ARS",
      true,
    );
    expect(fallback).toEqual(actual);
  });
  it("un fallo al leer el cierre no presenta datos actuales como un cierre guardado", async () => {
    reads.closing.mockRejectedValue(
      new Error("No pudimos cargar el cierre mensual."),
    );
    await expect(
      getReport("2020-01", "America/Argentina/Buenos_Aires", "ARS", true),
    ).rejects.toThrow("cierre mensual");
    expect(reads.ledger).not.toHaveBeenCalled();
  });
});
