import { Brand } from "@/components/shared/brand";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
export default function NoAccessPage() {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Brand />
        <h1>Tu cuenta no tiene acceso</h1>
        <p>
          Pedile al dueño que habilite tu cuenta para trabajar en Shelby Gym.
        </p>
        <form action={logoutAction}>
          <Button type="submit">Volver al ingreso</Button>
        </form>
      </div>
    </main>
  );
}
