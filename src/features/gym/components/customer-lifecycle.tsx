"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormFeedback, SubmitButton } from "@/components/shared/form-parts";
import { changeCustomerStatusAction } from "../server/actions";

type Status = "active" | "inactive" | "retired";

function StatusForm({
  id,
  revision,
  status,
  label,
  name,
}: {
  id: string;
  revision: number;
  status: Status;
  label: string;
  name?: string;
}) {
  const [result, action] = useActionState(changeCustomerStatusAction, {});
  return (
    <form action={action} className="lifecycle-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="status" value={status} />
      {name ? (
        <label>
          Para retirar el perfil, escribí {name}
          <input name="confirmName" required autoComplete="off" />
        </label>
      ) : null}
      <FormFeedback state={result} />
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}

export function CustomerLifecycle({
  id,
  revision,
  name,
  status,
  canRetire,
  currentPeriod,
}: {
  id: string;
  revision: number;
  name: string;
  status: Status;
  canRetire: boolean;
  currentPeriod: boolean;
}) {
  return (
    <section className="lifecycle-section" aria-labelledby="lifecycle-heading">
      <h2 id="lifecycle-heading">Estado del perfil</h2>
      {status === "active" ? (
        <>
          <p>Si dejó el gimnasio, marcalo de baja. Una cuota vencida por más de un mes no borra el perfil ni genera cobros nuevos.</p>
          <StatusForm id={id} revision={revision} status="inactive" label="Dar de baja" />
          {canRetire ? (
            <details>
              <summary>Retirar de la lista</summary>
              <p>El perfil quedará en Retirados y podrás recuperarlo. Se conservan las cuotas y los pagos.</p>
              <StatusForm id={id} revision={revision} status="retired" label="Retirar perfil" name={name} />
            </details>
          ) : null}
        </>
      ) : (
        <>
          <p>{status === "retired" ? "Perfil retirado. Los movimientos siguen guardados." : "Cliente dado de baja. Sus cuotas y pagos siguen disponibles."}</p>
          <StatusForm id={id} revision={revision} status="active" label="Recuperar perfil" />
          {!currentPeriod ? (
            <Link href={`/clientes/${id}/inscribir`}>O iniciar una cuota nueva desde el regreso →</Link>
          ) : null}
        </>
      )}
    </section>
  );
}
