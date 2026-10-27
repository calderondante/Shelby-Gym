import { getOwnerAlertData } from "@/features/notifications/server/data";
import { PageHeading } from "@/components/shared/page-heading";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
export const metadata = { title: "Avisos" };
export default async function OwnerAlertsPage() {
  const data = await getOwnerAlertData();
  return (
    <>
      <PageHeading
        eyebrow="ATENCIÓN DEL GIMNASIO"
        title="Avisos"
        description="Cuotas, facturas y servicios que necesitan tu atención."
      />
      <NotificationCenter initialData={data} />
    </>
  );
}
