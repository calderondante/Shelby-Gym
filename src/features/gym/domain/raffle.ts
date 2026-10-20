export function shiftDay(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Membership is valid for the draw through 30 calendar days after expiration. */
export function raffleExclusion(input: {
  registeredOn: string;
  cutoff: string;
  latestEnd?: string;
  inactive: boolean;
}) {
  if (input.registeredOn > input.cutoff) return "Alta posterior al sorteo";
  if (input.inactive) return "Perfil de baja o eliminado";
  if (!input.latestEnd) return "Sin cuota de socio";
  if (input.latestEnd < shiftDay(input.cutoff, -30))
    return "Cuota vencida hace más de 30 días";
  return null;
}

/** Current account state for the birthday list; draw eligibility uses its own cutoff. */
export function birthdayAccountStatus(input: {
  customerStatus: string;
  latestEnd?: string;
  balanceCents: number;
  today: string;
}) {
  if (input.customerStatus === "retired")
    return { label: "Eliminado", tone: "inactive" } as const;
  if (input.customerStatus === "inactive")
    return { label: "De baja", tone: "inactive" } as const;
  if (!input.latestEnd)
    return { label: "Sin cuota", tone: "inactive" } as const;
  if (input.latestEnd < shiftDay(input.today, -30))
    return {
      label: "Vencida hace más de 30 días",
      tone: "long-expired",
    } as const;
  if (input.latestEnd <= input.today)
    return { label: "Vencida", tone: "expired" } as const;
  if (input.balanceCents > 0)
    return { label: "Pendiente", tone: "due" } as const;
  return { label: "Al día", tone: "paid" } as const;
}
