import { redirect } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { ownerLoginEmail } from "@/features/auth/access";
import { LoginForm } from "@/features/auth/login-form";
import { hasSupabaseConfig } from "@/lib/supabase/env";
export const metadata = { title: "Ingresar" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ clave?: string }>;
}) {
  const params = await searchParams;
  const passwordOnly = Boolean(ownerLoginEmail());
  if (!hasSupabaseConfig()) redirect("/configuracion");
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Brand large />
        <p className="eyebrow">BIENVENIDO A SHELBY</p>
        <h1>
          El gimnasio,
          <br />
          en tus manos.
        </h1>
        <p className="muted">
          Ingresá para gestionar clientes, actividades y cuotas.
        </p>
        {params.clave === "actualizada" || params.clave === "activada" ? (
          <p role="status">Contraseña guardada. Ingresá con la nueva clave.</p>
        ) : null}
        <LoginForm passwordOnly={passwordOnly} />
        <p className="auth-note">
          Acceso exclusivo para el equipo.
          <br />
          {passwordOnly
            ? "Si olvidaste la clave, solicitá un enlace de recuperación al administrador técnico."
            : "Si necesitás recuperar tu acceso, contactá al dueño."}
        </p>
      </div>
    </main>
  );
}
