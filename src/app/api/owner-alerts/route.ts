import { requireOwner } from "@/features/gym/server/session";
import { getOwnerAlertData } from "@/features/notifications/server/data";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (new URL(request.url).searchParams.has("summary")) {
    const { db } = await requireOwner();
    const result = await db
      .from("owner_alerts")
      .select("alert_key", { count: "exact", head: true })
      .eq("is_read", false);
    return Response.json(
      result.error
        ? { error: "No pudimos actualizar los avisos." }
        : { unread: result.count ?? 0 },
      { status: result.error ? 503 : 200, headers },
    );
  }
  return Response.json(await getOwnerAlertData(), { headers });
}
