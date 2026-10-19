import { describe, it, expect } from "vitest";
import { columns, guessMapping } from "@/features/imports/domain/contracts";
import {
  excelDate,
  excelMoney,
  prepareImport,
} from "@/features/imports/domain/prepare";
import { createWorkbook } from "@/features/imports/domain/template";
import readXlsx from "read-excel-file/universal";
const headers = columns.map(([, label]) => label),
  mapping = guessMapping(headers);
const activity = "e47b1b1c-70c9-40cf-9b9e-38b59a453981";
const row = (overrides: Record<string, string | number> = {}) => {
  const data: Record<string, string | number> = {
    external_id: "001",
    name: "Cliente sintético",
    age_years: 31,
    phone: "",
    email: "",
    period_id: "febrero",
    activity: "Musculación",
    starts_on: "11/02/2026",
    ends_on: "11/03/2026",
    total: 20000,
    balance: 0,
    payment_id: "p1",
    payment_date: "11/02/2026",
    method: "efectivo",
    amount: 10000,
    ...overrides,
  };
  return columns.map(([key]) => data[key] ?? "");
};
const prepare = (rows: (string | number)[][]) =>
  prepareImport(
    [headers, ...rows],
    mapping,
    { Musculación: activity },
    "2026-01-01",
  );
describe("Importación de historial", () => {
  it("interpreta fechas civiles y rechaza días imposibles o ambiguos", () => {
    expect(excelDate("29/02/2024")).toBe("2024-02-29");
    expect(excelDate("29/02/2025")).toBeNull();
    expect(excelDate("03/04/26")).toBeNull();
    expect(excelDate(46000)).toBeNull();
  });
  it("importes argentinos exactos, sin inferir cero de vacío", () => {
    expect(excelMoney("25.000,50")).toBe(2500050);
    expect(excelMoney(25000.5)).toBe(2500050);
    expect(excelMoney("")).toBeNull();
    expect(excelMoney("-50")).toBeNull();
    expect(excelMoney("20,000.50")).toBeNull();
  });
  it("agrupa pagos mixtos y períodos con precios históricos independientes", () => {
    const r = prepare([
      row(),
      row({ method: "transferencia" }),
      row({
        period_id: "marzo",
        starts_on: "11/03/2026",
        ends_on: "11/04/2026",
        total: 30000,
        balance: 5000,
        payment_id: "p2",
        payment_date: "11/03/2026",
        method: "Mercado Pago",
        amount: 10000,
      }),
    ]);
    expect(r.issues).toEqual([]);
    expect(r.clients).toHaveLength(1);
    expect(r.clients[0].periods.map((p) => p.total_cents)).toEqual([
      2000000, 3000000,
    ]);
    expect(r.clients[0].periods[0].payments[0].entries).toHaveLength(2);
  });
  it("rechaza pagos repetidos y cuotas inconsistentes", () => {
    expect(prepare([row(), row()]).issues[0].message).toContain("duplicado");
    expect(prepare([row(), row({ total: 25000 })]).issues[0].message).toContain(
      "condiciones",
    );
  });
  it("permite perfil sin cuota y rechaza saldo o actividad desconocidos", () => {
    const empty = Object.fromEntries(columns.map(([k]) => [k, ""]));
    const rows = [
      row({ ...empty, external_id: "1", name: "Solo perfil", age_years: 20 }),
    ];
    expect(prepare(rows).issues).toEqual([]);
    expect(prepare([row({ balance: "" })]).issues.length).toBeGreaterThan(0);
    expect(
      prepareImport([headers, row()], mapping, {}, "2026-01-01").issues[0]
        .message,
    ).toContain("Asigná");
  });
  it("rechaza un historial que cobraría más de la cuota y edades inválidas", () => {
    expect(prepare([row({ amount: 30000 })]).issues[0].message).toContain(
      "superan",
    );
    expect(prepare([row({ age_years: 200 })]).issues.length).toBeGreaterThan(0);
  });
  it("la plantilla es un XLSX legible, sin ejecución de fórmulas", async () => {
    const data = createWorkbook([headers, row()]);
    const sheets = await readXlsx(new Uint8Array(data).buffer);
    expect(sheets[0].data[0]).toEqual(headers);
    expect(sheets[0].data[1][0]).toBe("001");
  });
});
