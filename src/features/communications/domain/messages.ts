import { z } from "zod";
import { endDate } from "@/features/gym/domain/dates";
export const channelSchema = z.enum(["whatsapp", "instagram"]);
export const purposeSchema = z.enum(["general", "recovery", "expense"]);
export type Channel = z.infer<typeof channelSchema>;
export type Purpose = z.infer<typeof purposeSchema>;
export const variableNames = [
  "nombre",
  "dueno",
  "gimnasio",
  "actividad",
  "vencimiento",
  "saldo",
  "oferta",
  "gasto",
  "importe",
  "dias",
] as const;
export type Variables = Partial<Record<(typeof variableNames)[number], string>>;
export const purposeVariables: Record<Purpose, readonly string[]> = {
  general: [
    "nombre",
    "gimnasio",
    "actividad",
    "vencimiento",
    "saldo",
    "oferta",
  ],
  recovery: [
    "nombre",
    "gimnasio",
    "actividad",
    "vencimiento",
    "saldo",
    "oferta",
  ],
  expense: [
    "nombre",
    "dueno",
    "gimnasio",
    "vencimiento",
    "saldo",
    "gasto",
    "importe",
    "dias",
  ],
};
export function templateError(body: string, purpose: Purpose): string | null {
  if (body.trim().length < 5 || body.length > 1500)
    return "El mensaje debe tener entre 5 y 1500 caracteres.";
  const unknown = [...body.matchAll(/\{([a-z_]+)\}/g)]
    .map((m) => m[1])
    .find((key) => !purposeVariables[purpose].includes(key));
  return unknown
    ? `La variable {${unknown}} no corresponde a este mensaje.`
    : null;
}
export function renderMessage(body: string, variables: Variables) {
  return body.replace(
    /\{([a-z_]+)\}/g,
    (marker: string, key: string) =>
      variables[key as keyof Variables] ?? marker,
  );
}
export function normalizePhone(raw: string): string | null {
  const value = raw.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(value) ? value : null;
}
export type Recipient = {
  id: string;
  name: string;
  phone: string;
  instagram: string;
  status: string;
  marketingOptIn: boolean;
  instagramMarketingOptIn: boolean;
  lastEnd: string | null;
  balance: number;
  activities: string;
};
export function recipientReason(
  recipient: Recipient,
  channel: Channel,
  segment: "selected" | "recovery",
  today: string,
): string | null {
  if (recipient.status === "retired") return "Perfil eliminado";
  if (
    segment === "recovery" &&
    (!recipient.lastEnd || endDate(recipient.lastEnd, 2, "months") > today)
  )
    return "Todavía no pasaron dos meses desde el vencimiento";
  if (channel === "whatsapp") {
    if (!normalizePhone(recipient.phone))
      return "Revisar celular: usá el código de país, por ejemplo +54";
    if (!recipient.marketingOptIn)
      return "Falta autorización para ofertas por WhatsApp";
  } else {
    if (!/^@[A-Za-z0-9_.]{1,30}$/.test(recipient.instagram))
      return "Falta Instagram en el perfil";
    if (!recipient.instagramMarketingOptIn)
      return "Falta autorización para ofertas por Instagram";
  }
  return null;
}
export function expensePhase(
  dueOn: string,
  day: string,
  rule: {
    notifyBefore: boolean;
    daysBefore: number;
    notifyOnDue: boolean;
    notifyOverdue: boolean;
    overdueEvery: number;
  },
): "before" | "due" | "overdue" | null {
  const distance = Math.round(
    (Date.parse(`${day}T12:00:00Z`) - Date.parse(`${dueOn}T12:00:00Z`)) /
      86400000,
  );
  if (distance === -rule.daysBefore && rule.notifyBefore) return "before";
  if (distance === 0 && rule.notifyOnDue) return "due";
  if (
    distance > 0 &&
    rule.notifyOverdue &&
    (distance - 1) % rule.overdueEvery === 0
  )
    return "overdue";
  return null;
}
export const templateSchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    channel: channelSchema,
    purpose: purposeSchema,
    body: z.string().trim().min(5).max(1500),
  })
  .superRefine((v, context) => {
    const error = templateError(v.body, v.purpose);
    if (error)
      context.addIssue({ code: "custom", message: error, path: ["body"] });
    if (v.purpose === "expense" && v.channel !== "whatsapp")
      context.addIssue({
        code: "custom",
        message: "Los avisos a dueños se preparan para WhatsApp.",
        path: ["channel"],
      });
  });
