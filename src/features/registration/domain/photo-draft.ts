import { civilDate, amountText } from "@/features/ocr/domain/text";
import { parseMoney } from "@/features/gym/domain/money";

export const personalFields = [
  { key: "name", label: "Nombre y apellido", max: 120 },
  { key: "phone", label: "Teléfono", max: 40 },
  { key: "instagram", label: "Instagram", max: 31 },
  { key: "email", label: "Correo", max: 254 },
  { key: "birthMonth", label: "Mes de cumpleaños", max: 2 },
] as const;
export const historicalFields = [
  { key: "activityId", label: "Actividad" },
  { key: "startsOn", label: "Inicio de la cuota o pack" },
  { key: "endsOn", label: "Vencimiento anotado" },
  { key: "total", label: "Importe pactado (ARS)" },
  { key: "paid", label: "Total ya abonado (ARS)" },
] as const;
export type PersonalKey = (typeof personalFields)[number]["key"];
export type HistoricalKey = (typeof historicalFields)[number]["key"];
export type RegistrationKey = PersonalKey | HistoricalKey;
export type PersonalValues = Record<PersonalKey, string>;
export type HistoricalValues = Record<HistoricalKey, string>;
export type RegistrationValues = PersonalValues & HistoricalValues;
export const emptyPersonal: PersonalValues = {
  name: "",
  phone: "",
  instagram: "",
  email: "",
  birthMonth: "",
};
export const emptyHistory: HistoricalValues = {
  activityId: "",
  startsOn: "",
  endsOn: "",
  total: "",
  paid: "",
};
export function historicalKey(key: RegistrationKey): key is HistoricalKey {
  return historicalFields.some((f) => f.key === key);
}
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
function monthValue(value: string) {
  const word = months.indexOf(fold(value));
  if (word >= 0) return String(word + 1);
  if (/^(?:[1-9]|0[1-9]|1[0-2])$/.test(value)) return String(Number(value));
  const date = civilDate(value);
  if (date) return String(Number(date.slice(5, 7)));
  const short = value.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (short && civilDate(`${short[1]}/${short[2]}/2000`))
    return String(Number(short[2]));
  return "";
}
const labels: [
  RegistrationKey | "givenName" | "surname" | "activityName",
  RegExp,
][] = [
  [
    "name",
    /^(?:nombre\s+y\s+apellido|apellido\s+y\s+nombre|nombre\s+completo)$/,
  ],
  ["givenName", /^nombres?$/],
  ["surname", /^apellidos?$/],
  ["phone", /^(?:telefono|tel\.?|celular|cel\.?)$/],
  ["instagram", /^(?:instagram|ig)$/],
  ["email", /^(?:correo(?:\s+electronico)?|e-?mail)$/],
  [
    "birthMonth",
    /^(?:mes\s+de\s+cumpleanos|cumpleanos|fecha\s+de\s+nacimiento|nacimiento)$/,
  ],
  ["activityName", /^(?:actividad|disciplina|plan)$/],
  [
    "startsOn",
    /^(?:inicio|fecha\s+de\s+inicio|inicio\s+de\s+(?:la\s+cuota|el\s+pack))$/,
  ],
  ["endsOn", /^(?:vencimiento|vto\.?|fecha\s+de\s+vencimiento)$/],
  [
    "total",
    /^(?:importe\s+pactado|monto\s+(?:pactado|acordado)|precio|importe\s+de\s+la\s+cuota|valor\s+de\s+la\s+cuota)$/,
  ],
  ["paid", /^(?:total\s+(?:ya\s+)?abonado|abonado|pagado|importe\s+pagado)$/],
];
function validValue(key: string, value: string): string {
  const v = value.trim();
  if (["name", "givenName", "surname"].includes(key))
    return /^[\p{L}][\p{L} .'-]{1,119}$/u.test(v) ? v : "";
  if (key === "phone")
    return /^[+\d ()-]{7,40}$/.test(v) && v.replace(/\D/g, "").length >= 7
      ? v
      : "";
  if (key === "email")
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254 ? v : "";
  if (key === "instagram") {
    const handle = v
      .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
      .replace(/\/$/, "")
      .replace(/^@/, "");
    return /^[A-Za-z0-9_.]{1,30}$/.test(handle) ? "@" + handle : "";
  }
  if (key === "birthMonth") return monthValue(v);
  if (key === "startsOn" || key === "endsOn") {
    const matches = v.match(/\b\d{1,2}[./-]\d{1,2}[./-](?:\d{4}|\d{2})\b/g);
    return matches?.length === 1 ? civilDate(matches[0]) : "";
  }
  if (key === "total" || key === "paid") {
    if (/\b(?:USD|EUR)\b|U\$S|US\$/i.test(v)) return "";
    if (key === "paid" && /^(?:ARS\s*)?\$?\s*0(?:[.,]00)?$/i.test(v))
      return "0";
    const amount = amountText(v);
    return amount && parseMoney(amount) !== null ? amount : "";
  }
  return v.length <= 100 ? v : "";
}
export function parseRegistrationText(text: string) {
  const lines = text
    .slice(0, 32000)
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const candidates = new Map<string, Set<string>>(),
    warnings: string[] = [];
  const labelKey = (s: string) =>
    labels.find(([, pattern]) =>
      pattern.test(fold(s.replace(/[:：]\s*$/, "").trim())),
    )?.[0];
  for (let i = 0; i < lines.length; i++) {
    const colon = lines[i].search(/[:：]/);
    const key = labelKey(colon < 0 ? lines[i] : lines[i].slice(0, colon));
    if (!key) continue; // Unknown labels (including health/emergency data) are never inferred.
    let raw = colon < 0 ? "" : lines[i].slice(colon + 1).trim();
    if (
      !raw &&
      lines[i + 1] &&
      !labelKey(lines[i + 1].split(/[:：]/)[0]) &&
      !/[:：]/.test(lines[i + 1])
    )
      raw = lines[i + 1];
    if (!raw) continue;
    const value = validValue(key, raw);
    const values = candidates.get(key) ?? new Set<string>();
    // Invalid candidates remain a marker: do not silently pick a second, plausible value.
    values.add(value || "[ilegible]");
    candidates.set(key, values);
  }
  const unique = (key: string) => {
    const set = candidates.get(key);
    if (!set) return "";
    if (set.size !== 1 || set.has("[ilegible]")) {
      warnings.push(
        "Hay datos ambiguos o ilegibles; los dejamos vacíos para completar a mano.",
      );
      return "";
    }
    return [...set][0];
  };
  if (
    (candidates.get("name")?.size ?? 0) > 1 ||
    (candidates.get("givenName")?.size ?? 0) > 1 ||
    (candidates.get("surname")?.size ?? 0) > 1
  )
    return {
      values: { ...emptyPersonal, ...emptyHistory },
      activityName: "",
      warnings: [
        "Parece haber más de una persona. Tomá una foto de una sola ficha.",
      ],
    };
  const values: RegistrationValues = { ...emptyPersonal, ...emptyHistory };
  for (const field of [...personalFields, ...historicalFields])
    if (field.key !== "activityId") values[field.key] = unique(field.key);
  const given = unique("givenName"),
    surname = unique("surname");
  const combined = given ? [given, surname].filter(Boolean).join(" ") : "";
  if (values.name && given && surname && fold(values.name) !== fold(combined)) {
    values.name = "";
    warnings.push(
      "El nombre completo no coincide con los campos de nombre y apellido; revisalo manualmente.",
    );
  } else if (!values.name && combined.length <= 120) values.name = combined;
  const activityName = unique("activityName");
  if (!Object.values(values).some(Boolean) && !activityName)
    warnings.push(
      "No reconocimos campos identificados. Podés completar la inscripción manualmente.",
    );
  return { values, activityName, warnings: [...new Set(warnings)] };
}
export function selectedRegistrationValues(
  values: RegistrationValues,
  current: RegistrationValues,
  selected: Set<RegistrationKey>,
  allowReplace: boolean,
  historyConfirmed: boolean,
) {
  const result: Partial<RegistrationValues> = {};
  for (const key of selected) {
    if (
      !values[key].trim() ||
      (current[key].trim() && !allowReplace) ||
      (historicalKey(key) && !historyConfirmed)
    )
      continue;
    result[key] = values[key];
  }
  return result;
}
