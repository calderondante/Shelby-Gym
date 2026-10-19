"use client";
import { useActionState, useState } from "react";
import { FieldGroup } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";
import { paymentAction } from "../server/actions";
import { blankPayments, PaymentFields } from "./payment-fields";
export function PaymentForm({
  subscriptionId,
  customerId,
  requestId,
  balance,
  currency,
}: {
  subscriptionId: string;
  customerId: string;
  requestId: string;
  balance: number;
  currency: string;
}) {
  const [operationId] = useState(requestId);
  const [state, action] = useActionState(paymentAction, {});
  const [values, setValues] = useState(blankPayments);
  return (
    <form action={action} className="editor-form">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="requestId" value={operationId} />
      <FieldGroup>
        <PaymentFields
          values={values}
          onChange={setValues}
          total={balance}
          currency={currency}
          errors={state.fieldErrors}
        />
        <FormFeedback state={state} />
        <SubmitButton>Registrar abono</SubmitButton>
        <p className="muted">
          Este abono reduce el saldo. No modifica el vencimiento de la
          suscripción.
        </p>
      </FieldGroup>
    </form>
  );
}
