import { redirect } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { LoginForm } from "@/features/auth/login-form";
import { hasSupabaseConfig } from "@/lib/supabase/env";
export const metadata = { title: "Ingresar" };
export default function LoginPage() {
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
        <LoginForm />
        <p className="auth-note">
          Acceso exclusivo para el equipo.
          <br />
          Si necesitás recuperar tu acceso, contactá al dueño.
        </p>
      </div>
    </main>
  );
}
