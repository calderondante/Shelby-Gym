import { describe, it, expect } from "vitest";
import {
  whatsappUrl,
  messageMoney,
  messageDate,
} from "../src/features/communications/domain/whatsapp";
describe("WhatsApp manual", () => {
  it("carga destinatario internacional y conserva acentos, saltos y caracteres reservados", () => {
    const text =
      "Hola Ana 👋\nCuota $ 12.500,00. Oferta 2×1 & turnos + horarios?";
    const url = new URL(whatsappUrl("+1 (202) 555-0111", text)!);
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/12025550111");
    expect(url.searchParams.get("text")).toBe(text);
    expect([...url.searchParams.keys()]).toEqual(["text"]);
  });
  it.each([
    "1123456789",
    "javascript:alert(1)",
    "+0012025550111",
    "https://ejemplo.com",
    "+1?text=otro",
  ])("rechaza números ambiguos o enlaces: %s", (phone) =>
    expect(whatsappUrl(phone, "Hola Ana")).toBeNull(),
  );
  it("rechaza texto vacío", () =>
    expect(whatsappUrl("+12025550111", "  ")).toBeNull());
  it("coincide con la moneda de las copias preparadas", () =>
    expect(messageMoney(1234567)).toBe("$ 12.345,67"));
  it("conserva fechas civiles sin cambiar zona", () => {
    expect(messageDate("2026-10-26")).toBe("26/10/2026");
    expect(messageDate(null)).toBe("Sin cuota mensual");
  });
});
