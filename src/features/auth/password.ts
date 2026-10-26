import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./password-policy";
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      .max(128, "Usá hasta 128 caracteres."),
    confirmation: z.string().max(128),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmation)
      ctx.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "Las contraseñas no coinciden.",
      });
  });
export const changePasswordSchema = newPasswordSchema
  .safeExtend({
    current: z.string().min(1, "Ingresá la contraseña actual.").max(128),
  })
  .superRefine((v, ctx) => {
    if (v.current === v.password)
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Elegí una contraseña distinta de la actual.",
      });
  });
