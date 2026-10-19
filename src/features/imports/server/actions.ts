"use server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/features/gym/server/session";
import {
  importRequest,
  importReport,
  type ImportReport,
} from "../domain/contracts";
export async function importHistoryAction(
  input: unknown,
  commit: boolean,
): Promise<{ report?: ImportReport; error?: string }> {
  const { db } = await requireOwner();
  if (typeof commit !== "boolean" || JSON.stringify(input)?.length > 700000)
    return { error: "La importación supera el tamaño permitido." };
  const parsed = importRequest.safeParse(input);
  if (!parsed.success)
    return {
      error:
        "Revisá los datos del Excel. Hay campos inválidos o se superaron los límites de importación.",
    };
  const { requestId, source, currency, clients } = parsed.data;
  const { data, error } = await db.rpc("import_gym_history", {
    p_request: requestId,
    p_source: source,
    p_currency: currency,
    p_clients: clients,
    p_commit: commit,
  });
  if (error)
    return {
      error:
        error.message === "IMPORT_CURRENCY_CHANGED"
          ? "La moneda cambió. Recargá y revisá los importes."
          : error.message === "REQUEST_CONFLICT"
            ? "Esta operación ya se registró con otros datos. Volvé a revisar el archivo."
            : "No se importó el archivo. Revisá la conexión e intentá nuevamente con los mismos datos.",
    };
  const report = importReport.safeParse(data);
  if (!report.success)
    return {
      error:
        "No pudimos comprobar el resultado. Conservá el archivo y reintentá: la operación evita duplicados.",
    };
  if (report.data.committed) revalidatePath("/clientes");
  return { report: report.data };
}
