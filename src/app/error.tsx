"use client";

import Link from "next/link";
import { PaginaError, claseAccionError } from "@/components/ui/pagina-error";

/** 500: algo falló al cargar. Reintentar vuelve a pedir la página (retry, Next 16.3+). */
export default function ErrorPanel({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PaginaError
      codigo="500"
      titulo="Algo falló al cargar"
      acciones={
        <>
          <button type="button" onClick={() => retry()} className={claseAccionError}>
            Reintentar
          </button>
          <Link href="/tablero" className={claseAccionError}>
            Ir a mi inicio
          </Link>
        </>
      }
    >
      No es algo que hayas hecho tú. Intenta de nuevo; si sigue fallando, avisa al equipo de la
      plataforma.
    </PaginaError>
  );
}
