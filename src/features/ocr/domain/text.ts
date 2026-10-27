export function civilDate(text: string) {
  const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/);
  if (!match) return "";
  const year = Number(match[3]) + (match[3].length === 2 ? 2000 : 0);
  const iso = `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const date = new Date(iso + "T12:00:00Z");
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}
export function amountText(text: string) {
  const match = text.match(/(?:ARS|\$)?\s*(\d[\d., ]*)/i);
  if (!match) return "";
  const raw = match[1].replace(/ /g, "").replace(/[.,]+$/, "");
  let normalized = raw;
  if (raw.includes(",")) normalized = raw.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, "");
  const n = Number(normalized);
  return Number.isFinite(n) &&
    n > 0 &&
    n <= 21474836.47 &&
    /^\d+(\.\d{1,2})?$/.test(normalized)
    ? n.toFixed(2).replace(".", ",")
    : "";
}
