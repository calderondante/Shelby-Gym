import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
export const requireStaff = cache(async () => {
  if (!hasSupabaseConfig()) redirect("/configuracion");
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: staff, error: staffError } = await db
    .from("staff")
    .select("id,name,role,active")
    .eq("id", data.user.id)
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
export const requireSettings = cache(async () => {
  const { db } = await requireStaff();
  const { data, error } = await db
    .from("gym_settings")
    .select("currency,time_zone")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar la configuración.");
  if (!data) redirect("/ajustes");
  return data;
});
