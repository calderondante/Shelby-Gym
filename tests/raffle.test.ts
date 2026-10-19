import { describe, expect, it } from "vitest";
import { raffleExclusion } from "@/features/gym/domain/raffle";

const cutoff = "2026-10-19";
const base = { cutoff, registeredOn: "2026-01-10", latestEnd: "2026-10-01", inactive: false };

describe("reglas del sorteo de cumpleaños", () => {
  it("excluye altas hechas después del cierre del año elegido", () => {
    expect(raffleExclusion({ ...base, registeredOn: "2026-10-20" })).toBe("Alta posterior al sorteo");
    expect(raffleExclusion({ ...base, cutoff: "2027-10-19", latestEnd: "2027-10-01", registeredOn: "2026-10-20" })).toBeNull();
  });

  it("mantiene elegible el día 30 y excluye desde el día 31 de vencimiento", () => {
    expect(raffleExclusion({ ...base, latestEnd: "2026-09-19" })).toBeNull();
    expect(raffleExclusion({ ...base, latestEnd: "2026-09-18" })).toBe("Cuota vencida hace más de 30 días");
  });

  it("excluye perfiles de baja o sin cuota previa al sorteo", () => {
    expect(raffleExclusion({ ...base, inactive: true })).toBe("Perfil de baja o eliminado");
    expect(raffleExclusion({ ...base, latestEnd: undefined })).toBe("Cuota vencida hace más de 30 días");
  });
});
