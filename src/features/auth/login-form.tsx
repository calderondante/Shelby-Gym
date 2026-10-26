"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";
import { FieldGroup } from "@/components/ui/field";
import {
  FormFeedback,
  SubmitButton,
  TextField,
} from "@/components/shared/form-parts";
export function LoginForm({
  passwordOnly = false,
}: {
  passwordOnly?: boolean;
}) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action}>
      <FieldGroup>
        {!passwordOnly ? (
          <TextField
            name="email"
            label="Correo electrónico"
            type="email"
            autoComplete="username"
            required
          />
        ) : null}
        <TextField
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
        />
        <FormFeedback state={state} />
        <SubmitButton pendingLabel="Entrando…">Entrar al gimnasio</SubmitButton>
      </FieldGroup>
    </form>
  );
}
