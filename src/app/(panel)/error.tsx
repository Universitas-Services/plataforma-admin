"use client";

import Link from "next/link";
import { PaginaError, claseAccionError } from "@/components/ui/pagina-error";

/**
 * Un error al cargar una sección: se muestra dentro del panel (la línea y la cabecera siguen),
 * con Reintentar, que vuelve a pedir la sección (retry, Next 16.3+).
 */
export default function ErrorSeccion({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PaginaError
      codigo="500"
      titulo="Esta sección no cargó"
      conLogo={false}
      acciones={
        <>
          <button type="button" onClick={() => retry()} className={claseAccionError}>
            Reintentar
          </button>
          <Link href="/tablero" className={claseAccionError}>
            Ir al tablero
          </Link>
        </>
      }
    >
      Puede ser una falla momentánea de la conexión con el servidor. Intenta de nuevo; si sigue
      pasando, avisa al equipo de la plataforma.
    </PaginaError>
  );
}
