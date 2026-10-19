import { PageHeading } from "@/components/shared/page-heading";
import { requireOwner, requireSettings } from "@/features/gym/server/session";
import { getActivities } from "@/features/gym/server/data";
import { todayIn } from "@/features/gym/domain/dates";
import { ImportWizard } from "@/features/imports/components/import-wizard";
export const metadata = { title: "Importar desde Excel" };
export default async function ImportPage() {
  await requireOwner();
  const [settings, activities] = await Promise.all([
    requireSettings(),
    getActivities(),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="BIENVENIDO A TU PRÓXIMA ETAPA"
        title="Tu gimnasio, sin empezar de cero."
        description="Importá tu Excel y seguí trabajando desde donde lo dejaste."
        back={{ href: "/clientes", label: "Clientes" }}
      />
      <ImportWizard
        activities={activities.map(({ id, name }) => ({ id, name }))}
        currency={settings.currency}
        today={todayIn(settings.time_zone)}
      />
    </>
  );
}
