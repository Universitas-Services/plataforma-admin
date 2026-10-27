import Image from "next/image";
import type { ReactNode } from "react";

/**
 * La línea cortada: tramo lleno, una estación, tramo discontinuo y el remate de fin de línea
 * con el código. Es el mismo dibujo para 403, 404 y 500 (estación fuera de servicio).
 */
function LineaCortada({ codigo }: { codigo: string }) {
  return (
    <div className="flex items-center" aria-hidden="true">
      <span className="h-1 w-10 bg-marca" />
      <span className="size-5 shrink-0 rounded-full border-[3px] border-papel bg-marca shadow-[0_0_0_2px_var(--marca)]" />
      <span className="h-0 flex-1 border-t-4 border-dashed border-tenue" />
      <span className="h-5 w-1 shrink-0 rounded-full bg-tenue" />
      <span className="ml-3 rounded-md bg-tinta px-2 py-0.5 text-xs font-bold tracking-wider text-papel">
        {codigo}
      </span>
    </div>
  );
}

/**
 * 403, 404 y 500. `conLogo` para las que se ven fuera del marco del panel (marca neutra de la
 * plataforma); dentro del panel ya están la línea y la franja.
 */
export function PaginaError({
  codigo,
  titulo,
  children,
  acciones,
  conLogo = true,
}: {
  codigo: string;
  titulo: string;
  children: ReactNode;
  acciones: ReactNode;
  conLogo?: boolean;
}) {
  return (
    <div
      className={`grid place-items-center px-4 py-12 ${conLogo ? "min-h-dvh" : "min-h-[60dvh]"}`}
    >
      <div className="w-full max-w-xl">
        {conLogo && (
          <Image
            src="/brand/pdul-ya-horizontal-divisor.png"
            alt="PDUL YA"
            width={1200}
            height={402}
            className="mb-10 h-12 w-auto"
          />
        )}
        <LineaCortada codigo={codigo} />
        <h1 className="mt-6 text-[1.75rem] leading-tight font-bold">{titulo}</h1>
        <div className="mt-2 text-gris">{children}</div>
        <div className="mt-8 flex flex-wrap gap-3">{acciones}</div>
      </div>
    </div>
  );
}

export const claseAccionError =
  "inline-flex min-h-11 items-center rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue";

export const claseAccionErrorPrimaria =
  "inline-flex min-h-11 items-center rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca hover:brightness-110";
