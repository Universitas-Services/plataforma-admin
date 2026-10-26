import Image from "next/image";
import type { ReactNode } from "react";
import { ALCALDIA, LOGOS } from "@/config/alcaldia";

const ESTACIONES = ["Contenido", "Participaciones", "Ciudadanos", "Indicadores"];

/**
 * Marco de las pantallas de acceso con la identidad de PDUL YA: a la izquierda, la banda oscura
 * del portal («patrón urbano») con el isotipo y la línea del panel; a la derecha, el formulario
 * con los logos de PDUL YA y de la Alcaldía, que solo van sobre fondo claro.
 */
export function MarcoAcceso({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="patron-urbano relative flex items-center gap-4 overflow-hidden px-6 py-5 text-papel sm:px-10 lg:flex-col lg:items-start lg:justify-between lg:py-12">
        <Image
          src={LOGOS.isotipo.src}
          alt=""
          width={LOGOS.isotipo.ancho}
          height={LOGOS.isotipo.alto}
          priority
          className="h-12 w-auto drop-shadow-lg lg:h-24"
        />
        <p className="font-display text-lg leading-tight font-bold lg:hidden">
          Panel {ALCALDIA.programa}
        </p>
        <div className="hidden lg:block" aria-hidden="true">
          <p className="font-display text-3xl leading-tight font-extrabold">
            Panel {ALCALDIA.programa}
          </p>
          <ol className="relative mt-12 space-y-7 border-l-4 border-papel/30 pl-8">
            {ESTACIONES.map((e, i) => (
              <li key={e} className="relative text-lg font-semibold text-papel/90">
                <span
                  className={`absolute top-1/2 -left-[2.65rem] -translate-y-1/2 rounded-full border-4 ${
                    i === ESTACIONES.length - 1
                      ? "size-6 border-papel bg-rojo"
                      : "size-4 border-papel/60 bg-noche"
                  }`}
                />
                {e}
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-sm text-sm leading-relaxed text-papel/85">
            Donde el equipo de la {ALCALDIA.nombre} publica, evalúa los aportes de la ciudadanía y
            rinde cuentas del plan.
          </p>
        </div>
        <p className="hidden text-xs text-papel/75 lg:block">Panel interno · acceso restringido</p>
      </aside>
      <main className="flex items-start justify-center px-4 py-10 sm:px-10 lg:items-center">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-4">
            <Image
              src={LOGOS.horizontal.src}
              alt={ALCALDIA.programa}
              width={LOGOS.horizontal.ancho}
              height={LOGOS.horizontal.alto}
              className="h-10 w-auto"
            />
            <span aria-hidden="true" className="h-8 w-px bg-linea" />
            <Image
              src={LOGOS.alcaldia.src}
              alt={ALCALDIA.nombre}
              width={LOGOS.alcaldia.ancho}
              height={LOGOS.alcaldia.alto}
              className="h-9 w-auto"
            />
          </div>
          <h1 className="text-[1.75rem] leading-tight font-bold">{titulo}</h1>
          {bajada && <p className="mt-2 text-gris">{bajada}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AvisoEstado({
  tipo = "info",
  children,
}: {
  tipo?: "info" | "exito";
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className={`mb-6 rounded-lg p-4 text-sm ring-1 ring-inset ${
        tipo === "exito"
          ? "bg-turquesa/10 text-tinta ring-turquesa/30"
          : "bg-superficie text-tinta ring-linea"
      }`}
    >
      {children}
    </p>
  );
}
