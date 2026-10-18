import Link from "next/link";
import { PaginaError, claseAccionError } from "@/components/ui/pagina-error";

export default function NoEncontrada() {
  return (
    <PaginaError
      codigo="404"
      titulo="Esta página no existe"
      acciones={
        <Link href="/" className={claseAccionError}>
          Ir a mi inicio
        </Link>
      }
    >
      Revisa la dirección o vuelve al inicio del panel.
    </PaginaError>
  );
}
