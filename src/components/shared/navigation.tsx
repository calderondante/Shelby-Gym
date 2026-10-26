"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Dumbbell,
  Settings2,
  History,
  MessagesSquare,
} from "lucide-react";
export function Navigation({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/clientes", label: "Clientes", Icon: Users },
    { href: "/actividades", label: "Actividades", Icon: Dumbbell },
    { href: "/historial", label: "Historial", Icon: History },
    ...(owner
      ? [
          { href: "/comunicaciones", label: "Mensajes", Icon: MessagesSquare },
          { href: "/ajustes", label: "Ajustes", Icon: Settings2 },
        ]
      : []),
  ];
  return (
    <nav className="primary-nav" aria-label="Navegación principal">
      {links.map(({ href, label, Icon }) => (
        <Link
          href={href}
          key={href}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
        >
          <Icon aria-hidden="true" size={19} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
