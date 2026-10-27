export type InvoiceDraft = {
  supplier: string;
  invoiceNumber: string;
  amount: string;
  dueOn: string;
  warnings: string[];
};
function civilDate(text: string) {
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
function amountText(text: string) {
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
export function parseInvoiceText(text: string): InvoiceDraft {
  const lines = text
    .slice(0, 32000)
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const dates = new Set<string>(),
    amounts = new Set<string>();
  const foreignCurrency = /\bUSD\b|\bEUR\b|U\$S|US\$/i.test(text);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /\b(vencimiento|vencimient0|venc\.?|vto\.?|pagar hasta)\b/i.test(line) &&
      !/\bCAEA?\b/i.test(line)
    ) {
      const date = civilDate(line) || civilDate(lines[i + 1] ?? "");
      if (date) dates.add(date);
    }
    const total = line.match(
      /^(?:importe\s*total|total(?:\s+a\s+pagar|\s+factura)?|saldo\s+a\s+pagar|a\s+pagar)\s*[:.\-]*\s*(.*)$/i,
    );
    if (
      total &&
      !/^total\s+(iva|impuestos|retenciones|descuentos)\b/i.test(line)
    ) {
      const amount = amountText(total[1]) || amountText(lines[i + 1] ?? "");
      if (amount) amounts.add(amount);
    }
  }
  const supplier =
    lines
      .slice(0, 8)
      .find(
        (line) =>
          /[a-záéíóúñ]{3}/i.test(line) &&
          !/^(factura|comprobante|cuit|iva\b|fecha|cliente|domicilio|pagina|página|c[oó]digo|original|duplicado|consumidor)/i.test(
            line,
          ),
      )
      ?.slice(0, 160) ?? "";
  const number =
    lines
      .join("\n")
      .match(
        /(?:factura|comprobante|nro\.?|n[úu]mero|n[º°])[^\n\d]{0,25}(\d{4,5}\s*-\s*\d{6,8})/i,
      )?.[1]
      ?.replace(/\s/g, "") ?? "";
  const warnings: string[] = [];
  if (foreignCurrency)
    warnings.push(
      "La factura indica otra moneda. No convertimos el importe a ARS automáticamente.",
    );
  if (amounts.size !== 1)
    warnings.push(
      amounts.size
        ? "Hay varios importes totales: elegí el que corresponde."
        : "No se reconoció un total; completalo manualmente.",
    );
  if (dates.size !== 1)
    warnings.push(
      dates.size
        ? "Hay varios vencimientos: elegí el que vas a registrar."
        : "No se reconoció el vencimiento; completalo manualmente.",
    );
  return {
    supplier,
    invoiceNumber: number,
    amount: !foreignCurrency && amounts.size === 1 ? [...amounts][0] : "",
    dueOn: dates.size === 1 ? [...dates][0] : "",
    warnings,
  };
}
