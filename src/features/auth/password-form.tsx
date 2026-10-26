"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { FieldGroup } from "@/components/ui/field";
import {
  FormFeedback,
  SubmitButton,
  TextField,
} from "@/components/shared/form-parts";
import {
  activatePasswordAction,
  changePasswordAction,
} from "./password-actions";
export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {});
  return (
    <section className="operation-panel">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">
        Contraseña de acceso
      </h2>
      <p className="muted">
        Ingresá la clave actual para elegir una nueva. Después tendrán que
        volver a entrar todos los dispositivos que usen esta cuenta.
      </p>
      <form action={action} className="operation-form">
        <FieldGroup>
          <TextField
            name="current"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
          <NewPasswordFields />
          <FormFeedback state={state} />
          <SubmitButton pendingLabel="Cambiando…">
            Cambiar contraseña
          </SubmitButton>
        </FieldGroup>
      </form>
    </section>
  );
}
function NewPasswordFields() {
  return (
    <>
      <TextField
        name="password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={128}
      />
      <TextField
        name="confirmation"
        label="Repetir nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={128}
      />
      <p className="muted">
        Usá al menos 12 caracteres. Una frase larga y fácil de recordar es una
        buena opción.
      </p>
    </>
  );
}
export function ActivatePasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [state, action] = useActionState(activatePasswordAction, {});
  if (token === null)
    return (
      <button
        className="text-link"
        type="button"
        onClick={() => {
          const hash = new URLSearchParams(location.hash.slice(1)).get(
            "token_hash",
          );
          history.replaceState(null, "", location.pathname);
          setToken(hash ?? "");
        }}
      >
        Elegir mi contraseña →
      </button>
    );
  if (!token)
    return (
      <>
        <p role="alert">
          Abrí el enlace de activación que te entregó el administrador técnico.
          Si venció o ya lo usaste, solicitá uno nuevo.
        </p>
        <Link className="text-link" href="/login">
          Volver al acceso
        </Link>
      </>
    );
  return (
    <form action={action}>
      <FieldGroup>
        <input type="hidden" name="tokenHash" value={token} />
        <NewPasswordFields />
        <FormFeedback state={state} />
        <SubmitButton pendingLabel="Guardando…">
          Guardar mi contraseña
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
