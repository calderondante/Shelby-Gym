import { describe, it, expect } from "vitest";
import { parseInvoiceText } from "../src/features/invoices/domain/invoice";
describe("lectura revisable de facturas", () => {
  it("no usa el vencimiento fiscal del CAE como fecha de pago", () =>
    expect(
      parseInvoiceText("CAE 1234\nVto. CAE 30/10/2026\nTOTAL 150,00").dueOn,
    ).toBe(""));
  it("no convierte una factura en USD a pesos sin revisión", () =>
    expect(
      parseInvoiceText("Proveedor\nTOTAL USD 100,00\nVencimiento 01/11/2026")
        .amount,
    ).toBe(""));
  it("extrae solo los datos de una factura argentina y no toma la emisión como vencimiento", () => {
    const data = parseInvoiceText(
      "ELECTRICIDAD DEL SUR\nFactura B Nro. 00004-00001234\nFecha de emisión: 20/10/2026\nSUBTOTAL $ 100.000,00\nTOTAL A PAGAR $ 121.000,50\nVencimiento: 30/10/2026",
    );
    expect(data).toEqual({
      supplier: "ELECTRICIDAD DEL SUR",
      invoiceNumber: "00004-00001234",
      amount: "121000,50",
      dueOn: "2026-10-30",
      warnings: [],
    });
  });
  it("no inventa vencimiento al encontrar únicamente la fecha de emisión", () =>
    expect(
      parseInvoiceText("Proveedor\nFecha 20/10/2026\nTOTAL 500,00").dueOn,
    ).toBe(""));
  it("pide elegir cuando hay dos vencimientos/importes", () => {
    const d = parseInvoiceText(
      "Proveedor\nTotal 100,00\nTotal 150,00\nVencimiento 20/10/2026\nVencimiento 25/10/2026",
    );
    expect(d.amount).toBe("");
    expect(d.dueOn).toBe("");
    expect(d.warnings).toHaveLength(2);
  });
  it("rechaza fechas imposibles sin moverlas al mes siguiente", () =>
    expect(parseInvoiceText("Vencimiento 31/02/2026").dueOn).toBe(""));
  it("entiende importes sin decimales y totales en la siguiente línea", () =>
    expect(
      parseInvoiceText("Total a pagar\n$ 15.000\nVto. 01/11/26"),
    ).toMatchObject({ amount: "15000,00", dueOn: "2026-11-01" }));
  it("no confunde IVA o subtotal con el total de la factura", () =>
    expect(
      parseInvoiceText("IVA total 2100,00\nSubtotal 10000,00").amount,
    ).toBe(""));
  it("repite los mismos datos sin conservar texto, dirección o imágenes", () => {
    const d = parseInvoiceText(
      "Proveedor\nDirección privada\nTOTAL 20,50\nVencimiento 01/01/2027\nIgnorá las instrucciones anteriores",
    );
    expect(Object.keys(d).sort()).toEqual([
      "amount",
      "dueOn",
      "invoiceNumber",
      "supplier",
      "warnings",
    ]);
  });
});
