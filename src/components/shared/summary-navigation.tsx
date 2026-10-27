import Link from "next/link";
export function SummaryNavigation({
  month,
  active,
}: {
  month: string;
  active: "overview" | "expenses" | "report";
}) {
  return (
    <nav className="operation-tabs" aria-label="Secciones de resumen">
      <Link
        href={`/historial?mes=${month}`}
        aria-current={active === "overview" ? "page" : undefined}
      >
        Resumen
      </Link>
      <Link
        href={`/historial/gastos?mes=${month}`}
        aria-current={active === "expenses" ? "page" : undefined}
      >
        Gastos
      </Link>
      <Link
        href={`/historial/resumen?mes=${month}`}
        aria-current={active === "report" ? "page" : undefined}
      >
        Informes y descarga
      </Link>
    </nav>
  );
}
