export function todayIn(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
/** A calendar month clamps to the last day of the destination month. */
export function endDate(
  start: string,
  duration: number,
  unit: "months" | "days",
): string {
  const [year, month, day] = start.split("-").map(Number);
  if (unit === "days")
    return new Date(Date.UTC(year, month - 1, day + duration))
      .toISOString()
      .slice(0, 10);
  const lastDay = new Date(Date.UTC(year, month + duration, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + duration, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
export function validity(start: string, end: string, today: string) {
  return today < start ? "Próxima" : today >= end ? "Vencida" : "Vigente";
}
