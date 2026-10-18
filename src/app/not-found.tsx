import Link from "next/link";
import { PaginaError, claseAccionErrorPrimaria } from "@/components/ui/pagina-error";

/** 404 fuera del panel (sin sesión o en las pantallas de acceso), con la marca neutra. */
export default function NoEncontrada() {
  return (
    <PaginaError
      codigo="404"
      titulo="Esta estación no existe"
      acciones={
        <Link href="/" className={claseAccionErrorPrimaria}>
          Ir al inicio
        </Link>
      }
    >
      La dirección que buscaste no lleva a ninguna pantalla del panel. Revisa el enlace o vuelve al
      inicio.
    </PaginaError>
  );
}
