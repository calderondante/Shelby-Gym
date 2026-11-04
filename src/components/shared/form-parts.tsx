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
    <Button
      type="submit"
      size="lg"
      className="submit-button"
      disabled={pending}
      aria-busy={pending}
      data-pending={pending}
    >
      <span className="submit-idle" aria-hidden={pending}>
        {children}
      </span>
      <span className="submit-pending" aria-hidden={!pending}>
        <span className="submit-spinner" aria-hidden="true" />
        {pendingLabel}
      </span>
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
    // A nested optional group can be inside another collapsed group.
    // Reveal every ancestor before focusing so the error is actually reachable.
    let details = (field ?? feedback.current)?.closest("details");
    while (details) {
      details.open = true;
      details = details.parentElement?.closest("details");
    }
    (field ?? feedback.current)?.focus();
  }, [state]);
  if (!state.error && !state.success) return null;
  return (
    <Alert
      ref={feedback}
      className="form-feedback"
      tabIndex={-1}
      variant={state.error ? "destructive" : "default"}
      role={state.error ? "alert" : "status"}
    >
      <AlertTitle>
        {state.error ? "No pudimos confirmar la operación" : "Listo"}
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
  const fieldId = props.id ?? name;
  const [draft, setDraft] = useState(props.defaultValue ?? "");
  const { defaultValue: _initialValue, ...inputProps } = props;
  void _initialValue;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <Input
        id={fieldId}
        name={name}
        spellCheck={props.type === "email" ? false : undefined}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...inputProps}
        value={props.value ?? draft}
        onChange={(event) => {
          setDraft(event.target.value);
          props.onChange?.(event);
        }}
      />
      {error ? <FieldError id={`${fieldId}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
