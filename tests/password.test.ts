import { describe, it, expect } from "vitest";
import {
  newPasswordSchema,
  changePasswordSchema,
} from "../src/features/auth/password";
describe("credenciales del gimnasio", () => {
  it("acepta una frase larga sin exigir correo", () =>
    expect(
      newPasswordSchema.safeParse({
        password: "Una frase extensa para entrar",
        confirmation: "Una frase extensa para entrar",
      }).success,
    ).toBe(true));
  it("acepta exactamente ocho caracteres", () =>
    expect(
      newPasswordSchema.safeParse({
        password: "Shelby26",
        confirmation: "Shelby26",
      }).success,
    ).toBe(true));
  it("rechaza siete caracteres aunque coincidan", () =>
    expect(
      newPasswordSchema.safeParse({
        password: "Abc123!",
        confirmation: "Abc123!",
      }).success,
    ).toBe(false));
  it("rechaza una confirmación diferente", () =>
    expect(
      newPasswordSchema.safeParse({
        password: "Contraseña extensa 2026",
        confirmation: "Otra contraseña extensa",
      }).success,
    ).toBe(false));
  it("exige la contraseña actual al cambiar", () =>
    expect(
      changePasswordSchema.safeParse({
        current: "",
        password: "Una nueva contraseña",
        confirmation: "Una nueva contraseña",
      }).success,
    ).toBe(false));
  it("rechaza reutilizar la misma contraseña", () =>
    expect(
      changePasswordSchema.safeParse({
        current: "Una contraseña extensa",
        password: "Una contraseña extensa",
        confirmation: "Una contraseña extensa",
      }).success,
    ).toBe(false));
  it("limita entradas excesivamente largas", () =>
    expect(
      newPasswordSchema.safeParse({
        password: "x".repeat(129),
        confirmation: "x".repeat(129),
      }).success,
    ).toBe(false));
});
