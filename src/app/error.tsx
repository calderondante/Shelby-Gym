"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="error-view" role="alert">
      <h1>No pudimos cargar la información</h1>
      <p>
        Revisá tu conexión y volvé a intentarlo. No se confirmó ningún cambio
        desde esta pantalla.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}
