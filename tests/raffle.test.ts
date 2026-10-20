import { describe, expect, it } from "vitest";
import {
  birthdayAccountStatus,
  raffleExclusion,
} from "@/features/gym/domain/raffle";

const cutoff = "2026-10-19";
const base = {
  cutoff,
  registeredOn: "2026-01-10",
  latestEnd: "2026-10-01",
  inactive: false,
};

describe("reglas del sorteo de cumpleaños", () => {
  it("excluye altas hechas después del cierre del año elegido", () => {
    expect(raffleExclusion({ ...base, registeredOn: "2026-10-20" })).toBe(
      "Alta posterior al sorteo",
    );
    expect(
      raffleExclusion({
        ...base,
        cutoff: "2027-10-19",
        latestEnd: "2027-10-01",
        registeredOn: "2026-10-20",
      }),
    ).toBeNull();
  });

  it("mantiene elegible el día 30 y excluye desde el día 31 de vencimiento", () => {
    expect(raffleExclusion({ ...base, latestEnd: "2026-09-19" })).toBeNull();
    expect(raffleExclusion({ ...base, latestEnd: "2026-09-18" })).toBe(
      "Cuota vencida hace más de 30 días",
    );
  });

  it("excluye perfiles de baja o sin cuota previa al sorteo", () => {
    expect(raffleExclusion({ ...base, inactive: true })).toBe(
      "Perfil de baja o eliminado",
    );
    expect(raffleExclusion({ ...base, latestEnd: undefined })).toBe(
      "Sin cuota de socio",
    );
  });

  it("muestra el estado de cuota de hoy sin confundir vencimiento con saldo", () => {
    const current = {
      customerStatus: "active",
      latestEnd: "2026-11-19",
      balanceCents: 0,
      today: cutoff,
    };
    expect(birthdayAccountStatus(current).label).toBe("Al día");
    expect(
      birthdayAccountStatus({ ...current, balanceCents: 5000 }).label,
    ).toBe("Pendiente");
    expect(
      birthdayAccountStatus({ ...current, latestEnd: "2026-09-19" }).label,
    ).toBe("Vencida");
    expect(
      birthdayAccountStatus({
        ...current,
        latestEnd: "2026-09-18",
        balanceCents: 5000,
      }).label,
    ).toBe("Vencida hace más de 30 días");
    expect(
      birthdayAccountStatus({ ...current, latestEnd: "2026-09-18" }).label,
    ).toBe("Vencida hace más de 30 días");
    expect(
      birthdayAccountStatus({ ...current, customerStatus: "inactive" }).label,
    ).toBe("De baja");
  });
});
