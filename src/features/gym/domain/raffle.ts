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
  if (!input.latestEnd || input.latestEnd < shiftDay(input.cutoff, -30))
    return "Cuota vencida hace más de 30 días";
  return null;
}
