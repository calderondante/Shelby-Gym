"use client";
import { useActionState, useState } from "react";
import { FieldGroup } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";
import { updateCustomerAction } from "../server/actions";
import { CustomerFields } from "./customer-fields";
import type { Tables } from "@/lib/supabase/database.types";
export function ProfileForm({
  customer: initialCustomer,
}: {
  customer: Tables<"customers">;
}) {
  const [customer] = useState(initialCustomer);
  const [state, action] = useActionState(updateCustomerAction, {});
  return (
    <form action={action} className="editor-form">
      <input type="hidden" name="id" value={customer.id} />
      <input type="hidden" name="revision" value={customer.revision} />
      <FieldGroup>
        <CustomerFields customer={customer} errors={state.fieldErrors} />
        <FormFeedback state={state} />
        <SubmitButton>Guardar perfil</SubmitButton>
      </FieldGroup>
    </form>
  );
}
