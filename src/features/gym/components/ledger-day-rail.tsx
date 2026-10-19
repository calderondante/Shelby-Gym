"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export type LedgerDay = {
  date: string;
  weekday: string;
  number: number;
  received: number;
  hasMovement: boolean;
};

const compact = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 0,
});

export function LedgerDayRail({
  days,
  month,
  selected,
}: {
  days: LedgerDay[];
  month: string;
  selected: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!rail.current || !active.current) return;
    rail.current.scrollLeft =
      active.current.offsetLeft -
      (rail.current.clientWidth - active.current.clientWidth) / 2;
  }, [selected]);

  return (
    <div className="ledger-day-rail" ref={rail} role="navigation" aria-label="Días del mes">
      {days.map((day) => (
        <Link
          key={day.date}
          href={`/historial?mes=${month}&dia=${day.date}`}
          scroll={false}
          ref={day.date === selected ? active : undefined}
          aria-current={day.date === selected ? "date" : undefined}
          aria-label={`${day.weekday} ${day.number}: ${day.hasMovement ? "con movimientos" : "sin movimientos"}`}
        >
          <span className="ledger-day-weekday">{day.weekday}</span>
          <strong>{day.number}</strong>
          <small>{day.received ? `$ ${compact.format(day.received / 100)}` : day.hasMovement ? "●" : "—"}</small>
        </Link>
      ))}
    </div>
  );
}
