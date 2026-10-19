import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { Brand } from "@/components/shared/brand";
export default function ConfigurationPage() {
  if (hasSupabaseConfig()) redirect("/login");
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Brand large />
        <h1>Preparar el entorno</h1>
        <p>
          La aplicación está instalada. Falta conectar la base de datos de este
          entorno.
        </p>
        <p>
          Seguí <code>docs/DEVELOPMENT.md</code> para iniciar Supabase local,
          configurar <code>.env.local</code> y crear la primera cuenta del
          dueño.
        </p>
        <p className="muted">
          No se muestran clientes ni pagos de demostración en la aplicación.
        </p>
      </div>
    </main>
  );
}
