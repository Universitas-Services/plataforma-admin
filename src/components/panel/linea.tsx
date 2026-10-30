"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALCALDIA, LOGOS } from "@/config/alcaldia";

export type Estacion = {
  href: string;
  etiqueta: string;
  contador?: number;
};

const activa = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);

const claseEstacion =
  "relative flex h-11 items-center justify-between pr-4 pl-[3.625rem] text-[0.9375rem]";

/**
 * La línea: el sidebar dibujado como una línea de metro en el color de la marca, con una
 * estación por sección. La estación actual es un círculo de correspondencia relleno; la línea
 * remata con una barra de fin de recorrido, como en la señalética.
 */
export function Linea({
  estaciones,
  sigla,
  nombreLinea,
  demo = false,
  alNavegar,
}: {
  estaciones: Estacion[];
  sigla: string;
  nombreLinea: string;
  /** Datos simulados: lo dice al pie del menú. */
  demo?: boolean;
  alNavegar?: () => void;
}) {
  const ruta = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/tablero"
        onClick={alNavegar}
        className="block border-b border-linea px-5 pt-5 pb-4"
      >
        <Image
          src={LOGOS.horizontal.src}
          alt={`${ALCALDIA.programa}, ir al tablero`}
          width={LOGOS.horizontal.ancho}
          height={LOGOS.horizontal.alto}
          priority
          className="h-11 w-auto"
        />
        <span className="mt-2 block text-xs font-medium text-gris">
          Panel de la {ALCALDIA.nombre.replace("Alcaldía del Municipio", "Alcaldía de")}
        </span>
      </Link>
      <p className="flex items-center gap-2.5 px-5 pt-5 pb-2">
        <span className="rounded-md bg-marca px-2 py-1 text-[0.8125rem] font-bold tracking-wider text-sobre-marca">
          {sigla}
        </span>
        <span className="text-[0.9375rem] leading-tight font-bold text-tinta">{nombreLinea}</span>
      </p>
      <nav aria-label="Secciones" className="relative py-1.5">
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-5 left-[1.9375rem] w-1 bg-marca"
        />
        {/* Fin de línea. */}
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[1.5625rem] h-1 w-4 rounded-full bg-marca"
        />
        <ul className="pb-4">
          {estaciones.map((e) => {
            const on = activa(ruta, e.href);
            return (
              <li key={e.href}>
                <Link
                  href={e.href}
                  onClick={alNavegar}
                  aria-current={on ? "page" : undefined}
                  className={`${claseEstacion} transition-colors duration-150 ${
                    on
                      ? "mr-3 rounded-r-md bg-papel font-bold text-tinta"
                      : "font-medium text-tinta hover:bg-papel/60"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-[width,height,left] duration-200 ease-[var(--ease-salida)] ${
                      on
                        ? "left-[1.4375rem] size-5 border-[3px] border-papel bg-marca shadow-[0_0_0_2px_var(--marca)]"
                        : "left-[1.6875rem] size-3 border-[3px] border-marca bg-papel"
                    }`}
                  />
                  {e.etiqueta}
                  {e.contador !== undefined && (
                    <span className="rounded-full bg-tinta px-2 text-xs font-semibold text-papel">
                      {e.contador}
                      <span className="sr-only"> por atender</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {demo && (
        <p className="mt-auto px-5 pb-5 text-xs text-gris">
          <span className="rounded border border-dashed border-tenue px-2 py-1">
            Datos de demostración
          </span>
        </p>
      )}
    </div>
  );
}
