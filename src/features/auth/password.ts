import { z } from "zod";
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Usá al menos 12 caracteres.")
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
