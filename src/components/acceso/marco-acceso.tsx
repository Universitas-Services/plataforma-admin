import Image from "next/image";
import type { ReactNode } from "react";

const ESTACIONES = ["Alcaldías", "Equipo", "Contenido", "Participación"];

/**
 * Marco de las pantallas de acceso, siempre con la marca neutra de la plataforma (todavía no
 * hay alcaldía). A la izquierda, la línea de la plataforma con sus estaciones; en el teléfono
 * queda arriba, reducida al logo.
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
      <aside className="relative flex flex-col justify-between overflow-hidden bg-tinta px-6 py-6 text-papel sm:px-10 lg:py-12">
        <Image
          src="/marca/logo-horizontal-blanco.svg"
          alt="Plataforma de Participación Ciudadana"
          width={200}
          height={64}
          priority
          className="h-11 w-auto self-start lg:h-14"
        />
        <div className="hidden lg:block" aria-hidden="true">
          <ol className="relative mt-16 space-y-7 border-l-4 border-papel/30 pl-8">
            {ESTACIONES.map((e, i) => (
              <li key={e} className="relative text-lg font-semibold text-papel/90">
                <span
                  className={`absolute top-1/2 -left-[2.65rem] -translate-y-1/2 rounded-full border-4 ${
                    i === ESTACIONES.length - 1
                      ? "size-6 border-papel bg-turquesa"
                      : "size-4 border-papel/60 bg-tinta"
                  }`}
                />
                {e}
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-sm text-sm leading-relaxed text-papel/80">
            Un solo panel para todas las alcaldías: cada una publica, evalúa y rinde cuentas con su
            propia marca.
          </p>
        </div>
        <p className="hidden text-xs text-papel/70 lg:block">Panel interno · acceso restringido</p>
      </aside>
      <main className="flex items-start justify-center px-4 py-10 sm:px-10 lg:items-center">
        <div className="w-full max-w-md">
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
