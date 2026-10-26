import { normalizePhone } from "./messages";
/** Official click-to-chat URL. No request is made until the operator opens it. */
export function whatsappUrl(phone: string, body: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized || !body.trim()) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(body)}`;
}
/** Matches the money/date formatting used by the preparation RPCs. */
export function messageMoney(cents: number) {
  return (
    "$ " +
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100)
  );
}
export function messageDate(day: string | null) {
  return day ? day.split("-").reverse().join("/") : "Sin cuota mensual";
}
