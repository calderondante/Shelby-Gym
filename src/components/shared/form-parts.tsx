"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/features/gym/server/actions";
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
export function FormFeedback({ state }: { state: ActionResult }) {
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.error) return;
    const field = feedback.current
      ?.closest("form")
      ?.querySelector<HTMLElement>("[aria-invalid=true]");
    const details = field?.closest("details");
    if (details) details.open = true;
    (field ?? feedback.current)?.focus();
  }, [state]);
  if (!state.error && !state.success) return null;
  return (
    <Alert
      ref={feedback}
      tabIndex={-1}
      variant={state.error ? "destructive" : "default"}
      role={state.error ? "alert" : "status"}
    >
      <AlertTitle>
        {state.error ? "No se guardó la operación" : "Listo"}
      </AlertTitle>
      <AlertDescription>
        {state.error ?? state.success}
        {state.fieldErrors?.[""] ? <p>{state.fieldErrors[""]}</p> : null}
        {state.fieldErrors?.payments ? (
          <p>{state.fieldErrors.payments}</p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
export function TextField({
  label,
  error,
  name,
  ...props
}: {
  label: string;
  error?: string;
  name: string;
} & React.ComponentProps<"input">) {
  const [draft, setDraft] = useState(props.defaultValue ?? "");
  const { defaultValue: _initialValue, ...inputProps } = props;
  void _initialValue;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        spellCheck={props.type === "email" ? false : undefined}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        {...inputProps}
        value={props.value ?? draft}
        onChange={(event) => {
          setDraft(event.target.value);
          props.onChange?.(event);
        }}
      />
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
