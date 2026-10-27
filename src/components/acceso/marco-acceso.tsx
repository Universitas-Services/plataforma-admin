import Image from "next/image";
import type { ReactNode } from "react";
import { ALCALDIA, LOGOS } from "@/config/alcaldia";

/**
 * Marco de las pantallas de acceso: una tarjeta clara centrada sobre la banda oscura del portal
 * («patrón urbano»). Los dos logos solo funcionan sobre fondo claro, así que van juntos, centrados
 * y a la misma altura óptica en la cabecera de la tarjeta: PDUL YA y la Alcaldía como un solo
 * sello. Ocupa el alto que deja la cinta de demostración (el `body` es una columna flexible), así
 * que no hay desplazamiento si el contenido cabe.
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
    <div className="patron-urbano flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6 sm:py-10 [@media(max-height:720px)]:gap-3 [@media(max-height:720px)]:py-4">
      <main className="w-full max-w-[29rem] rounded-[1.75rem] bg-papel px-6 py-7 shadow-2xl shadow-black/40 sm:px-10 sm:py-9 [@media(max-height:720px)]:py-6">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <Image
            src={LOGOS.horizontal.src}
            alt={ALCALDIA.programa}
            width={LOGOS.horizontal.ancho}
            height={LOGOS.horizontal.alto}
            priority
            className="h-10 w-auto sm:h-12"
          />
          <span aria-hidden="true" className="h-10 w-px shrink-0 bg-linea sm:h-12" />
          <Image
            src={LOGOS.alcaldia.src}
            alt={ALCALDIA.nombre}
            width={LOGOS.alcaldia.ancho}
            height={LOGOS.alcaldia.alto}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </div>
        <div className="mt-6 border-t border-linea pt-6 text-center sm:mt-7 sm:pt-7 [@media(max-height:720px)]:mt-5 [@media(max-height:720px)]:pt-5">
          <h1 className="text-[1.625rem] leading-tight font-bold">{titulo}</h1>
          {bajada && <p className="mt-1.5 text-gris">{bajada}</p>}
        </div>
        <div className="mt-6 [@media(max-height:720px)]:mt-4">{children}</div>
      </main>
      <p className="text-center text-xs text-papel/75">
        Panel {ALCALDIA.programa} · uso interno de la {ALCALDIA.nombre}
      </p>
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
