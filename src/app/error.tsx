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
        Revisá tu conexión y volvé a cargar la pantalla. Si estabas guardando un
        pago, pudo haberse registrado aunque no haya llegado la respuesta.
        Consultá el historial antes de volver a cargarlo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}
