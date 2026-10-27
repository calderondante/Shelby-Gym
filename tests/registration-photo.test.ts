import { describe, expect, it } from "vitest";
import {
  emptyHistory,
  emptyPersonal,
  parseRegistrationText,
  selectedRegistrationValues,
  type RegistrationValues,
} from "../src/features/registration/domain/photo-draft";
const blank: RegistrationValues = { ...emptyPersonal, ...emptyHistory };
describe("borrador de inscripción desde una foto", () => {
  it("identifica campos explícitos sin copiar datos médicos, firmas ni consentimientos", () => {
    const d = parseRegistrationText(
      "SHELBY GYM\nNombre y apellido: Sofía Pérez\nTeléfono: +54 9 11 4567 8901\nInstagram: @sofi.perez\nCorreo: sofia@example.test\nFecha de nacimiento: 18/04/1992\nDatos médicos: información privada\nFirma: Persona\nAcepta ofertas: sí",
    );
    expect(d.values).toEqual({
      ...blank,
      name: "Sofía Pérez",
      phone: "+54 9 11 4567 8901",
      instagram: "@sofi.perez",
      email: "sofia@example.test",
      birthMonth: "4",
    });
    expect(JSON.stringify(d)).not.toContain("información privada");
    expect(d).not.toHaveProperty("marketingOptIn");
  });
  it("une nombre y apellido separados y permite etiquetas en una línea propia", () => {
    expect(
      parseRegistrationText(
        "Nombre:\nAna María\nApellido: Gómez\nTeléfono:\n1122334455",
      ).values,
    ).toMatchObject({ name: "Ana María Gómez", phone: "1122334455" });
  });
  it("permite prellenar un nombre explícito aunque falte el apellido", () => {
    expect(parseRegistrationText("Nombre: Ana María").values.name).toBe(
      "Ana María",
    );
  });
  it("conserva sólo el mes de cumpleaños y normaliza un enlace Instagram", () => {
    expect(
      parseRegistrationText(
        "Cumpleaños: abril\nIG: https://instagram.com/ana.gomez/",
      ).values,
    ).toMatchObject({ birthMonth: "4", instagram: "@ana.gomez" });
    expect(parseRegistrationText("Cumpleaños: 29/02").values.birthMonth).toBe(
      "2",
    );
  });
  it("no usa un teléfono de emergencia como teléfono del cliente", () => {
    expect(
      parseRegistrationText(
        "Teléfono de emergencia: 1199999999\nContacto: María",
      ).values.phone,
    ).toBe("");
  });
  it("no adivina campos a partir de números o texto sin etiqueta", () => {
    expect(
      parseRegistrationText("Juan Pérez\n1144445555\n31\n25000").values,
    ).toEqual(blank);
  });
  it("rechaza un nombre contradictorio y dos fichas en una sola foto", () => {
    expect(
      parseRegistrationText(
        "Nombre y apellido: Ana Gómez\nNombre: Marta\nApellido: Pérez",
      ).values.name,
    ).toBe("");
    const d = parseRegistrationText(
      "Nombre y apellido: Ana Gómez\nTeléfono: 1144445555\nNombre y apellido: Juan Pérez\nTeléfono: 1166667777",
    );
    expect(d.values).toEqual(blank);
    expect(d.warnings.join()).toContain("una sola ficha");
  });
  it("deja vacío un teléfono ambiguo o con letras sin corregirlo silenciosamente", () => {
    expect(
      parseRegistrationText("Teléfono: 1144445555\nCelular: 1166667777").values
        .phone,
    ).toBe("");
    expect(parseRegistrationText("Teléfono: 11O4445555").values.phone).toBe("");
  });
  it("no toma un campo siguiente como valor de un campo vacío", () => {
    expect(
      parseRegistrationText("Nombre:\nTeléfono: 1144445555").values,
    ).toMatchObject({ name: "", phone: "1144445555" });
  });
  it("extrae historia argentina sin equipararla a un pago recibido hoy", () => {
    const d = parseRegistrationText(
      "Actividad: Musculación\nFecha de inicio: 11/02/2026\nVencimiento: 11/03/2026\nImporte pactado: $ 25.000,50\nTotal ya abonado: $ 18.000\nSaldo pendiente: $ 7.000,50",
    );
    expect(d.activityName).toBe("Musculación");
    expect(d.values).toMatchObject({
      activityId: "",
      startsOn: "2026-02-11",
      endsOn: "2026-03-11",
      total: "25000,50",
      paid: "18000,00",
    });
    expect(d).not.toHaveProperty("payments");
  });
  it("no infiere lo abonado del saldo ni asigna una actividad automáticamente", () => {
    const d = parseRegistrationText(
      "Actividad: Boxeo\nImporte pactado: $ 25000\nSaldo pendiente: $ 5000",
    );
    expect(d.values.paid).toBe("");
    expect(d.values.activityId).toBe("");
  });
  it("admite cero abonado y no convierte moneda extranjera", () => {
    expect(parseRegistrationText("Abonado: $ 0,00").values.paid).toBe("0");
    expect(
      parseRegistrationText("Importe pactado: USD 100\nPagado: EUR 50").values,
    ).toMatchObject({ total: "", paid: "" });
  });
  it("deja vacías fechas inválidas o con más de una alternativa", () => {
    expect(
      parseRegistrationText(
        "Inicio: 31/02/2026\nVencimiento: 11/03/2026 o 12/03/2026",
      ).values,
    ).toMatchObject({ startsOn: "", endsOn: "" });
  });
  it("no admite importes que exceden la validación vigente de la app", () => {
    expect(
      parseRegistrationText("Importe pactado: $ 2.000.000").values.total,
    ).toBe("");
  });
  it("conserva datos escritos incluso si se completaron durante el escaneo", () => {
    const proposed = { ...blank, name: "Ana Gómez", phone: "1144445555" };
    expect(
      selectedRegistrationValues(
        proposed,
        { ...blank, name: "Nombre ya escrito" },
        new Set(["name", "phone"]),
        false,
        false,
      ),
    ).toEqual({ phone: "1144445555" });
    expect(
      selectedRegistrationValues(
        proposed,
        { ...blank, name: "Nombre ya escrito" },
        new Set(["name"]),
        true,
        false,
      ),
    ).toEqual({ name: "Ana Gómez" });
  });
  it("sólo aplica campos elegidos y requiere revisión independiente para historia", () => {
    const proposed = { ...blank, name: "Ana Gómez", total: "25000", paid: "0" };
    const chosen = new Set<"name" | "total">(["name", "total"]);
    expect(
      selectedRegistrationValues(proposed, blank, chosen, false, false),
    ).toEqual({ name: "Ana Gómez" });
    expect(
      selectedRegistrationValues(proposed, blank, chosen, false, true),
    ).toEqual({ name: "Ana Gómez", total: "25000" });
  });
});
