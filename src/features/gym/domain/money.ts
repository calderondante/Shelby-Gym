/** All persisted amounts are integer minor units. Never parse money with parseFloat. */
export function parseMoney(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= 100_000_000 ? amount : null;
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
export function amountInput(amount: number) {
  return (amount / 100).toFixed(2);
}
