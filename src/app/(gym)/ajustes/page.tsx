import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/page-heading";
import { ChangePasswordForm } from "@/features/auth/password-form";
import { SettingsForm } from "@/features/gym/components/settings-form";
import { requireStaff } from "@/features/gym/server/session";
export default async function SettingsPage() {
  const { db, staff } = await requireStaff();
  const { data, error } = await db
    .from("gym_settings")
    .select("currency,time_zone")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar la configuración.");
  return (
    <>
      <PageHeading
        eyebrow="SHELBY GYM"
        title={data ? "Ajustes" : "Antes de empezar"}
        description="La moneda y las fechas con las que trabaja tu gimnasio."
      />
      {staff.role === "owner" && data ? (
        <div className="operation-tabs">
          <Link
            href="/comunicaciones"
            className={buttonVariants({ variant: "outline" })}
          >
            Comunicaciones y avisos
          </Link>
        </div>
      ) : null}
      {staff.role === "owner" ? (
        <>
          <SettingsForm settings={data} />
          <ChangePasswordForm />
        </>
      ) : (
        <p>
          El dueño debe confirmar la configuración inicial antes de registrar
          clientes.
        </p>
      )}
    </>
  );
}
