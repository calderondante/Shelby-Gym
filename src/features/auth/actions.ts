"use server";
import { z } from "zod";
import { ownerLoginEmail } from "./access";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import type { ActionResult } from "@/features/gym/server/actions";
export async function loginAction(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!hasSupabaseConfig())
    return { error: "El acceso todavía no está configurado." };
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(128) })
    .safeParse({
      email: ownerLoginEmail() ?? form.get("email"),
      password: form.get("password"),
    });
  if (!parsed.success)
    return {
      error: ownerLoginEmail()
        ? "Ingresá la contraseña del gimnasio."
        : "Ingresá tu correo y contraseña.",
    };
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error:
        "No pudimos iniciar sesión. Revisá tus datos o intentá de nuevo en unos minutos.",
    };
  redirect("/clientes");
}
export async function logoutAction() {
  const db = await createClient();
  const { error } = await db.auth.signOut({ scope: "local" });
  if (error)
    throw new Error("No pudimos cerrar la sesión. Intentá nuevamente.");
  redirect("/login");
}
