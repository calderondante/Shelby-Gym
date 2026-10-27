import { requireStaff } from "@/features/gym/server/session";
import { InteractionMotion } from "@/components/shared/motion";
import { Brand } from "@/components/shared/brand";
import { Navigation } from "@/components/shared/navigation";
import { LiveSync } from "@/components/shared/live-sync";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
export const dynamic = "force-dynamic";
export default async function GymLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { staff } = await requireStaff();
  return (
    <div className="app-shell">
      <InteractionMotion />
      <a href="#main" className="skip-link">
        Ir al contenido
      </a>
      <aside className="sidebar">
        <Brand />
        <span className="workspace-label">GESTIÓN DEL GIMNASIO</span>
        <Navigation owner={staff.role === "owner"} />
        <div className="staff-menu">
          <div className="staff-avatar" aria-hidden="true">
            {staff.name.slice(0, 1)}
          </div>
          <div>
            <strong>{staff.name}</strong>
            <small>{staff.role === "owner" ? "Dueño" : "Monitor"}</small>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost">
              Salir
            </Button>
          </form>
        </div>
      </aside>
      <div className="workspace">
        <div className="workspace-top">
          <span>
            Shelby Gym <span className="muted">/ Recepción</span>
          </span>
          <LiveSync />
          {staff.role === "owner" ? <NotificationBell /> : null}
        </div>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          SHELBY GYM <span>Todo en orden. A seguir creciendo.</span>
        </footer>
      </div>
    </div>
  );
}
