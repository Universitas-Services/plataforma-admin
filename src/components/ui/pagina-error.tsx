import Image from "next/image";
import type { ReactNode } from "react";

/**
 * 403, 404 y 500: la misma estación «fuera de servicio», con la marca neutra de la plataforma
 * (se muestran fuera del marco del panel).
 */
export function PaginaError({
  codigo,
  titulo,
  children,
  acciones,
}: {
  codigo: string;
  titulo: string;
  children: ReactNode;
  acciones: ReactNode;
}) {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Image
          src="/marca/logo-horizontal.svg"
          alt="Plataforma de Participación Ciudadana"
          width={175}
          height={56}
          className="h-12 w-auto"
        />
        <div className="mt-10 flex items-center gap-3" aria-hidden="true">
          <span className="size-4 rounded-full border-[3px] border-tinta bg-papel" />
          <span className="tramo-espera h-0 flex-1 border-t-[3px] border-dashed border-tenue" />
          <span className="rounded bg-tinta px-2 py-0.5 text-xs font-bold tracking-wider text-papel">
            {codigo}
          </span>
        </div>
        <h1 className="mt-6 text-[1.75rem] leading-tight font-bold">{titulo}</h1>
        <div className="mt-2 text-gris">{children}</div>
        <div className="mt-8 flex flex-wrap gap-3">{acciones}</div>
      </div>
    </div>
  );
}

export const claseAccionError =
  "inline-flex min-h-11 items-center rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue";
