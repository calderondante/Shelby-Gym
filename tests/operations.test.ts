import { describe, it, expect } from "vitest";
import { recoveryEligible, csvRows } from "@/features/gym/domain/operations";
import {
  customerSchema,
  activitySchema,
} from "@/features/gym/validation/contracts";
describe("reglas aprobadas de la actualización", () => {
  it("cuenta dos meses calendario desde el vencimiento y respeta fin de mes", () => {
    expect(recoveryEligible("2026-08-31", "2026-10-30")).toBe(false);
    expect(recoveryEligible("2026-08-31", "2026-10-31")).toBe(true);
    expect(recoveryEligible("2026-12-31", "2027-02-28")).toBe(true);
    expect(recoveryEligible(null, "2026-10-20")).toBe(false);
  });
  it("normaliza Instagram y rechaza enlaces o contenido ejecutable", () => {
    const base = { name: "Clara Díaz", phone: "", notes: "", birthMonth: 10 };
    expect(
      customerSchema.parse({ ...base, instagram: " clara.diaz " }).instagram,
    ).toBe("@clara.diaz");
    expect(
      customerSchema.safeParse({
        ...base,
        instagram: "https://instagram.com/clara",
      }).success,
    ).toBe(false);
    expect(
      customerSchema.safeParse({ ...base, instagram: "@clara<script>" })
        .success,
    ).toBe(false);
  });
  it("acepta packs por clases sin ampliar el máximo de meses", () => {
    const base = {
      name: "Boxeo particular",
      description: "",
      price: "30000",
      offerPrice: "",
      offerLabel: "",
      active: true,
    };
    expect(
      activitySchema.safeParse({ ...base, duration: 3, unit: "sessions" })
        .success,
    ).toBe(true);
    expect(
      activitySchema.safeParse({ ...base, duration: 25, unit: "months" })
        .success,
    ).toBe(false);
  });
  it("exporta CSV con textos seguros para Excel y números utilizables", () => {
    const csv = csvRows([
      ['=HYPERLINK("https://example.test")', "@usuario", -25, "Clara; Díaz"],
    ]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'@usuario");
    expect(csv).toContain('"-25"');
    expect(csv).toContain('"Clara; Díaz"');
  });
});
