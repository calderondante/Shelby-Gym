import { PageHeading } from "@/components/shared/page-heading";
import { ActivityForm } from "@/features/gym/components/activity-form";
import { requireOwner, requireSettings } from "@/features/gym/server/session";
export default async function NewActivityPage() {
  await requireOwner();
  const settings = await requireSettings();
  return (
    <>
      <PageHeading
        eyebrow="CREAR UNA PLANTILLA"
        title="Nueva actividad"
        description="Una disciplina o una combinación. Vos definís qué incluye."
        back={{ href: "/actividades", label: "Actividades" }}
      />
      <ActivityForm currency={settings.currency} />
    </>
  );
}
