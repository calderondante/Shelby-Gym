import { PageHeading } from "@/components/shared/page-heading";
import { ProfileForm } from "@/features/gym/components/profile-form";
import { getCustomer } from "@/features/gym/server/data";
export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customer } = await getCustomer(id);
  return (
    <>
      <PageHeading
        eyebrow="DATOS DEL CLIENTE"
        title="Editar perfil"
        back={{ href: `/clientes/${id}`, label: customer.name }}
      />
      <ProfileForm customer={customer} />
    </>
  );
}
