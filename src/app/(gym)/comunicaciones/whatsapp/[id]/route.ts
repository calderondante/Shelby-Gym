import { prepareManualWhatsapp } from "@/features/communications/server/manual-whatsapp";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await prepareManualWhatsapp(id);
  const target =
    "url" in result
      ? result.url
      : new URL(
          "/comunicaciones?seccion=historial&aviso=" +
            encodeURIComponent(result.reason),
          request.url,
        ).toString();
  return new Response(null, {
    status: 303,
    headers: {
      Location: target,
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
