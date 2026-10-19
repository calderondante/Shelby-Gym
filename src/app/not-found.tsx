import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="error-view">
      <h1>No encontramos esta página</h1>
      <p>El enlace puede ser incorrecto o el registro ya no está disponible.</p>
      <Link className={buttonVariants()} href="/clientes">
        Volver a clientes
      </Link>
    </section>
  );
}
