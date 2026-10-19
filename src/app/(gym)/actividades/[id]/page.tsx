import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { ActivityForm } from "@/features/gym/components/activity-form";
import { requireOwner, requireSettings } from "@/features/gym/server/session";
import { uuid } from "@/features/gym/validation/contracts";
export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [{ db }, settings] = await Promise.all([
    requireOwner(),
    requireSettings(),
  ]);
  const { data, error } = await db
    .from("activities")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar la actividad.");
  if (!data) notFound();
  return (
    <>
      <PageHeading
        eyebrow="CONFIGURACIÓN COMERCIAL"
        title="Editar actividad"
        description="Los cambios se aplican a nuevos períodos. Las cuotas existentes no cambian."
        back={{ href: "/actividades", label: "Actividades" }}
      />
      <ActivityForm currency={settings.currency} activity={data} />
    </>
  );
}
