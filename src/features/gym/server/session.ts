import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
const authenticatedContext = cache(async () => {
  if (!hasSupabaseConfig()) redirect("/configuracion");
  const db = await createClient();
  // getClaims verifies the signature/expiry; it is not an unverified cookie decode.
  // The staff query below still enforces the live role and session via RLS.
  const { data, error } = await db.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  return { db, userId: data.claims.sub };
});
export const requireStaff = cache(async () => {
  const { db, userId } = await authenticatedContext();
  const { data: staff, error: staffError } = await db
    .from("staff")
    .select("id,name,role,active")
    .eq("id", userId)
    .maybeSingle();
  if (staffError)
    throw new Error("No pudimos verificar tu acceso. Intentá de nuevo.");
  if (!staff?.active) redirect("/sin-acceso");
  return { db, staff };
});
export async function requireOwner() {
  const context = await requireStaff();
  if (context.staff.role !== "owner") redirect("/clientes");
  return context;
}
const readSettings = cache(async () => {
  const { db } = await authenticatedContext();
  return db
    .from("gym_settings")
    .select("currency,time_zone")
    .eq("id", true)
    .maybeSingle();
});
export const requireSettings = cache(async () => {
  // Both reads use the same verified session and remain protected by RLS.
  const [, result] = await Promise.all([requireStaff(), readSettings()]);
  if (result.error) throw new Error("No pudimos cargar la configuración.");
  if (!result.data) redirect("/ajustes");
  return result.data;
});
