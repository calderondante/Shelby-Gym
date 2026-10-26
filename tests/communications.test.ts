import { describe, it, expect } from "vitest";
import {
  expensePhase,
  normalizePhone,
  recipientReason,
  renderMessage,
  templateSchema,
  type Recipient,
} from "@/features/communications/domain/messages";
const person: Recipient = {
  id: "sample",
  name: "Ana",
  phone: "+54 9 11 1234 5678",
  instagram: "@ana",
  status: "inactive",
  marketingOptIn: true,
  instagramMarketingOptIn: false,
  lastEnd: "2026-08-31",
  balance: 100,
  activities: "Musculación",
};
describe("comunicaciones sin cuentas conectadas", () => {
  it("no interpreta las variables presentes dentro de un nombre", () => {
    expect(
      renderMessage("Hola {nombre}, {oferta}", {
        nombre: "Ana {oferta}",
        oferta: "Volvé",
      }),
    ).toBe("Hola Ana {oferta}, Volvé");
  });
  it("no adivina código de país ni admite enlaces como números", () => {
    expect(normalizePhone("+54 (9) 11-1234 5678")).toBe("+5491112345678");
    expect(normalizePhone("1112345678")).toBeNull();
    expect(normalizePhone("https://wa.me/5491112345678")).toBeNull();
  });
  it("requiere autorización independiente por canal y dos meses desde el vencimiento", () => {
    expect(
      recipientReason(person, "whatsapp", "recovery", "2026-10-30"),
    ).toContain("dos meses");
    expect(
      recipientReason(person, "whatsapp", "recovery", "2026-10-31"),
    ).toBeNull();
    expect(
      recipientReason(person, "instagram", "recovery", "2026-10-31"),
    ).toContain("autorización");
    expect(
      recipientReason(
        { ...person, instagramMarketingOptIn: true },
        "instagram",
        "recovery",
        "2026-10-31",
      ),
    ).toBeNull();
    expect(
      recipientReason(
        { ...person, lastEnd: null },
        "whatsapp",
        "recovery",
        "2026-10-31",
      ),
    ).not.toBeNull();
    expect(
      recipientReason(
        { ...person, status: "retired" },
        "whatsapp",
        "selected",
        "2026-10-31",
      ),
    ).not.toBeNull();
  });
  it("avisa antes, al vencer y cada N días desde el primer día vencido", () => {
    const rule = {
      notifyBefore: true,
      daysBefore: 3,
      notifyOnDue: true,
      notifyOverdue: true,
      overdueEvery: 3,
    };
    expect(expensePhase("2026-11-01", "2026-10-29", rule)).toBe("before");
    expect(expensePhase("2026-11-01", "2026-10-31", rule)).toBeNull();
    expect(expensePhase("2026-11-01", "2026-11-01", rule)).toBe("due");
    expect(expensePhase("2026-11-01", "2026-11-02", rule)).toBe("overdue");
    expect(expensePhase("2026-11-01", "2026-11-03", rule)).toBeNull();
    expect(expensePhase("2026-11-01", "2026-11-05", rule)).toBe("overdue");
    expect(
      expensePhase("2026-11-01", "2026-11-05", {
        ...rule,
        notifyOverdue: false,
      }),
    ).toBeNull();
  });
  it("rechaza variables desconocidas y boletas por Instagram", () => {
    expect(
      templateSchema.safeParse({
        title: "Aviso",
        channel: "instagram",
        purpose: "expense",
        body: "Hola {dueno}",
      }).success,
    ).toBe(false);
    expect(
      templateSchema.safeParse({
        title: "Aviso",
        channel: "whatsapp",
        purpose: "general",
        body: "Hola {secret}",
      }).success,
    ).toBe(false);
  });
});
