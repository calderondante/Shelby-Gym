"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/features/gym/server/session";
import type { ActionResult } from "@/features/gym/server/actions";
import { changePasswordSchema, newPasswordSchema } from "./password";
import { ownerLoginEmail } from "./access";
const fields = (form: FormData) => ({
  password: form.get("password"),
  confirmation: form.get("confirmation"),
});
export async function changePasswordAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireOwner();
  const parsed = changePasswordSchema.safeParse({
    ...fields(form),
    current: form.get("current"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error: userError } = await db.auth.getUser();
  if (userError || !data.user?.email)
    return { error: "Tu sesión no está disponible. Volvé a ingresar." };
  const verified = await db.auth.signInWithPassword({
    email: data.user.email,
    password: parsed.data.current,
  });
  if (verified.error)
    return {
      error:
        "La contraseña actual no es correcta o se alcanzó el límite de intentos. Revisala e intentá más tarde.",
    };
  const updated = await db.auth.updateUser({ password: parsed.data.password });
  if (updated.error)
    return {
      error:
        "No pudimos confirmar el cambio. Probá iniciar sesión antes de volver a intentarlo.",
    };
  const closed = await db.auth.signOut({ scope: "global" });
  if (closed.error)
    return {
      error:
        "La contraseña cambió, pero no pudimos confirmar el cierre de todas las sesiones. Volvé a ingresar y avisá al administrador técnico.",
    };
  redirect("/login?clave=actualizada");
}
export async function activatePasswordAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(fields(form));
  const token = z
    .string()
    .regex(/^[A-Za-z0-9_-]{32,512}$/)
    .safeParse(form.get("tokenHash"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!token.success)
    return {
      error: "El enlace de activación no es válido. Solicitá uno nuevo.",
    };
  const db = await createClient();
  const verified = await db.auth.verifyOtp({
    token_hash: token.data,
    type: "recovery",
  });
  if (verified.error || !verified.data.user)
    return {
      error: "El enlace venció o ya fue utilizado. Solicitá uno nuevo.",
    };
  const user = verified.data.user;
  const { data: staff, error } = await db
    .from("staff")
    .select("role,active")
    .eq("id", user.id)
    .maybeSingle();
  if (
    error ||
    !staff?.active ||
    staff.role !== "owner" ||
    (ownerLoginEmail() && user.email !== ownerLoginEmail())
  ) {
    await db.auth.signOut({ scope: "local" });
    return { error: "Este enlace no habilita el acceso del dueño." };
  }
  const updated = await db.auth.updateUser({ password: parsed.data.password });
  if (updated.error)
    return {
      error:
        "No pudimos confirmar la contraseña. Probá ingresar o solicitá otro enlace antes de repetir.",
    };
  const closed = await db.auth.signOut({ scope: "global" });
  if (closed.error)
    return {
      error:
        "La contraseña se guardó, pero no pudimos confirmar el cierre de sesiones. Contactá al administrador técnico.",
    };
  redirect("/login?clave=activada");
}
