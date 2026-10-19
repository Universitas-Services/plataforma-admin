import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Encabezado de página: título, una línea de contexto y las acciones a la derecha. */
export function EncabezadoPagina({
  titulo,
  bajada,
  acciones,
}: {
  titulo: string;
  bajada?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] leading-tight font-bold">{titulo}</h1>
        {bajada && <p className="mt-1 text-[0.9375rem] text-gris">{bajada}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

const claseBoton = {
  primario: "bg-marca text-sobre-marca border-marca hover:brightness-110",
  secundario: "bg-papel text-tinta border-linea hover:border-tenue",
};

export function BotonEnlace({
  href,
  children,
  variante = "secundario",
  Icono,
}: {
  href: string;
  children: ReactNode;
  variante?: keyof typeof claseBoton;
  Icono?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center gap-2 rounded-control border px-4 text-sm font-semibold transition-[filter,border-color] duration-150 ${claseBoton[variante]}`}
    >
      {Icono && <Icono size={16} aria-hidden="true" />}
      {children}
    </Link>
  );
}

/** Estado vacío que enseña la pantalla: qué irá aquí y qué hacer mientras tanto. */
export function EstadoVacio({
  Icono,
  titulo,
  children,
  accion,
}: {
  Icono: LucideIcon;
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-dashed border-linea px-6 py-12 text-center">
      <Icono size={28} aria-hidden="true" className="mx-auto text-marca-texto" />
      <h2 className="mt-3 text-lg font-bold">{titulo}</h2>
      <div className="mx-auto mt-1.5 max-w-prose text-[0.9375rem] text-gris">{children}</div>
      {accion && <div className="mt-6 flex justify-center">{accion}</div>}
    </section>
  );
}

const ESTADO_INSIGNIA = {
  PENDIENTE: { texto: "Pendiente", clase: "border-tenue text-tinta", relleno: false },
  EN_REVISION: {
    texto: "En revisión",
    clase: "border-transparent bg-[#E6EBF3] text-tinta",
    relleno: true,
  },
  APROBADA: { texto: "Verificada", clase: "border-turquesa/40 text-turquesa-texto", relleno: true },
  RECHAZADA: { texto: "Rechazada", clase: "border-peligro/40 text-peligro", relleno: false },
  PUBLICADA: {
    texto: "Publicada",
    clase: "border-transparent bg-turquesa/15 text-turquesa-texto",
    relleno: true,
  },
  ACTIVA: { texto: "Activa", clase: "border-turquesa/40 text-turquesa-texto", relleno: true },
  ONBOARDING_PENDIENTE: {
    texto: "Onboarding pendiente",
    clase: "border-ambar/50 text-ambar-texto",
    relleno: false,
  },
  SUSPENDIDA: { texto: "Suspendida", clase: "border-peligro/40 text-peligro", relleno: false },
} as const;

/** Insignia de estado: el punto lleno o hueco repite el estado sin depender del color. */
export function InsigniaEstado({ estado }: { estado: keyof typeof ESTADO_INSIGNIA }) {
  const e = ESTADO_INSIGNIA[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap ${e.clase}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full border-2 border-current ${e.relleno ? "bg-current" : ""}`}
      />
      {e.texto}
    </span>
  );
}
