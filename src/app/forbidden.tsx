import Link from "next/link";
import { PaginaError, claseAccionError } from "@/components/ui/pagina-error";

/** 403: la sección existe, pero tu rol no puede verla. */
export default function Prohibido() {
  return (
    <PaginaError
      codigo="403"
      titulo="Esta sección no es para tu rol"
      acciones={
        <Link href="/" className={claseAccionError}>
          Ir a mi inicio
        </Link>
      }
    >
      Si crees que deberías tener acceso, pide al administrador de tu alcaldía que revise tus roles.
    </PaginaError>
  );
}
