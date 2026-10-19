"use client";
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
}: {
  values: PaymentInput;
  onChange: (value: PaymentInput) => void;
  total: number;
  currency: string;
  errors?: Record<string, string>;
}) {
  const paid = Object.values(values).reduce(
    (sum, value) => sum + (parseMoney(value) ?? 0),
    0,
  );
  return (
    <FieldSet>
      <FieldLegend>Abono recibido</FieldLegend>
      <FieldDescription>
        Completá los medios que usó el cliente. Podés combinar los tres.
      </FieldDescription>
      <FieldGroup className="payment-fields">
        {Object.entries(paymentMethods).map(([method, label]) => (
          <TextField
            key={method}
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
          <dt>Abonás ahora</dt>
          <dd>{money(paid, currency)}</dd>
        </div>
        <div className={paid > total ? "amount-error" : ""}>
          <dt>{paid > total ? "Supera el saldo en" : "Queda pendiente"}</dt>
          <dd>{money(Math.abs(total - paid), currency)}</dd>
        </div>
      </dl>
      <FieldDescription>
        Este registro no cobra dinero. Confirmá que recibiste los importes antes
        de guardar.
      </FieldDescription>
    </FieldSet>
  );
}
