"use client";

import { PaginaError, claseAccionError } from "@/components/ui/pagina-error";

/** La API no respondió al revisar la sesión (caída o lenta): se ofrece reintentar. */
export function SinConexion() {
  return (
    <PaginaError
      codigo="503"
      titulo="No pudimos conectar con el servidor"
      acciones={
        <button type="button" onClick={() => window.location.reload()} className={claseAccionError}>
          Reintentar
        </button>
      }
    >
      Tu sesión sigue abierta. Puede ser una falla momentánea de la conexión: intenta de nuevo en
      unos segundos.
    </PaginaError>
  );
}
