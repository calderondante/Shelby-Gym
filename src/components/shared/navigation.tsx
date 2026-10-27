"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
// Next 16.4's PrefetchOptions requires this enum for a complete dynamic route.
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import {
  Users,
  Dumbbell,
  Settings2,
  History,
  MessagesSquare,
} from "lucide-react";
function NavigationFeedback({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span className="nav-pending" data-pending={pending} aria-hidden="true" />
      <span className="sr-only" role="status">
        {pending ? `Abriendo ${label}…` : ""}
      </span>
    </>
  );
}
export function Navigation({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const warmed = useRef(new Map<string, number>());
  const warm = useCallback(
    (href: string) => {
      const connection = (
        navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }
      ).connection;
      if (
        !navigator.onLine ||
        connection?.saveData ||
        connection?.effectiveType?.includes("2g") ||
        href === window.location.pathname ||
        performance.now() - (warmed.current.get(href) ?? -Infinity) < 20_000
      )
        return;
      // Deduplicate intent, without automatically rewarming after refreshes.
      warmed.current.set(href, performance.now());
      router.prefetch(href, { kind: PrefetchKind.FULL });
    },
    [router],
  );
  useEffect(() => {
    const enable = () => {
      for (const href of ["/clientes", "/actividades", "/historial"]
        .filter((href) => href !== window.location.pathname)
        .slice(0, 2))
        warm(href);
    };
    let idle: number | undefined;
    // Let the foreground navigation and its cache invalidation settle first.
    const timer = setTimeout(() => {
      if ("requestIdleCallback" in window)
        idle = window.requestIdleCallback(enable, { timeout: 1500 });
      else enable();
    }, 500);
    return () => {
      clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, [warm]);
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
          prefetch={false}
          onPointerEnter={() => warm(href)}
          onPointerDown={() => warm(href)}
          onFocus={() => warm(href)}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
        >
          <Icon aria-hidden="true" size={19} />
          <span>{label}</span>
          <NavigationFeedback label={label} />
        </Link>
      ))}
    </nav>
  );
}
