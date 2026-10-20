"use client";
import { useActionState } from "react";
import { recordRaffleDrawAction } from "../server/actions";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";

export function RaffleDrawForm({
  month,
  today,
}: {
  month: string;
  today: string;
}) {
  const [state, action] = useActionState(recordRaffleDrawAction, {});
  return (
    <form action={action} className="raffle-draw-form">
      <input type="hidden" name="month" value={month} />
      <label htmlFor="drawOn">Fecha del sorteo {month.slice(0, 4)}</label>
      <input
        id="drawOn"
        name="drawOn"
        type="date"
        defaultValue={month.slice(0, 4) === today.slice(0, 4) ? today : ""}
        max={today}
        min={`${month.slice(0, 4)}-01-01`}
        required
      />
      <SubmitButton pendingLabel="Registrando…">
        Cerrar sorteo y conservar lista
      </SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}
