import { Brand } from "@/components/shared/brand";
import { ActivatePasswordForm } from "@/features/auth/password-form";
export const metadata = {
  title: "Elegir contraseña",
  referrer: "no-referrer" as const,
};
export default function ActivatePage() {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Brand large />
        <p className="eyebrow">TU ACCESO A SHELBY</p>
        <h1>Elegí tu contraseña.</h1>
        <p className="muted">
          La vas a usar para entrar al gimnasio desde el celular o la PC.
          Guardala en un lugar seguro.
        </p>
        <ActivatePasswordForm />
      </div>
    </main>
  );
}
