"use client";
import { useId } from "react";
import {
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "@/components/ui/field";
import { TextField } from "@/components/shared/form-parts";
import { money, parseMoney } from "../domain/money";
import { paymentMethods } from "../validation/contracts";
export type PaymentInput = {
  cash: string;
  transfer: string;
  mercado_pago: string;
};
export const blankPayments: PaymentInput = {
  cash: "",
  transfer: "",
  mercado_pago: "",
};
export function PaymentFields({
  values,
  onChange,
  total,
  currency,
  errors = {},
  kind = "income",
}: {
  values: PaymentInput;
  onChange: (value: PaymentInput) => void;
  total: number;
  currency: string;
  errors?: Record<string, string>;
  kind?: "income" | "expense";
}) {
  const idPrefix = useId();
  const paid = Object.values(values).reduce(
    (sum, value) => sum + (parseMoney(value) ?? 0),
    0,
  );
  return (
    <FieldSet>
      <FieldLegend>
        {kind === "expense" ? "Pago realizado" : "Abono recibido"}
      </FieldLegend>
      <FieldDescription>
        {kind === "expense"
          ? "Completá los medios con los que pagaste este gasto. Podés combinarlos."
          : "Completá los medios que usó el cliente. Podés combinar los tres."}
      </FieldDescription>
      <FieldGroup className="payment-fields">
        {Object.entries(paymentMethods).map(([method, label]) => (
          <TextField
            key={method}
            id={`${idPrefix}-${method}`}
            name={method}
            label={label}
            inputMode="decimal"
            placeholder="0,00"
            value={values[method as keyof PaymentInput]}
            onChange={(e) => onChange({ ...values, [method]: e.target.value })}
            error={errors[`payments.${method}`]}
            maxLength={12}
            autoComplete="off"
          />
        ))}
      </FieldGroup>
      <dl className="payment-summary" aria-live="polite">
        <div>
          <dt>{kind === "expense" ? "Pagado ahora" : "Abonás ahora"}</dt>
          <dd>{money(paid, currency)}</dd>
        </div>
        <div className={paid > total ? "amount-error" : ""}>
          <dt>{paid > total ? "Supera el saldo en" : "Queda pendiente"}</dt>
          <dd>{money(Math.abs(total - paid), currency)}</dd>
        </div>
      </dl>
      <FieldDescription>
        {kind === "expense"
          ? "Confirmá que el dinero ya salió antes de guardar. Este formulario registra el pago."
          : "Este registro no cobra dinero. Confirmá que recibiste los importes antes de guardar."}
      </FieldDescription>
    </FieldSet>
  );
}
