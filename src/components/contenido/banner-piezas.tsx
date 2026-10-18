import { ArrowRight } from "lucide-react";
import type { Banner, Vigencia } from "@/lib/contenido/tipos";
import { TramoEstado, formatearFecha } from "./estado-noticia";

/*
 * Piezas de los banners: la vista aproximada del banner del portal y su vigencia dibujada con
 * el mismo tramo que el estado de las noticias.
 */

const TONO: Record<Banner["tono"], { panel: string; texto: string; boton: string }> = {
  rojo: {
    panel: "bg-marca text-sobre-marca",
    texto: "",
    boton: "bg-papel text-tinta",
  },
  tinta: {
    panel: "bg-banner-oscuro text-papel",
    texto: "text-papel/85",
    boton: "bg-banner-calido text-banner-oscuro",
  },
  calido: {
    panel: "bg-banner-calido text-banner-oscuro",
    texto: "text-banner-oscuro/85",
    boton: "bg-banner-oscuro text-papel",
  },
};

/**
 * Aproximación del banner en el Inicio del portal: tono de fondo o foto con velo, título,
 * texto y botón. `compacta` para las tarjetas de la lista.
 */
export function VistaBanner({
  banner: b,
  compacta = false,
}: {
  banner: Pick<Banner, "titulo" | "texto" | "enlace" | "tono" | "imagen">;
  compacta?: boolean;
}) {
  const t = TONO[b.tono];
  const conFoto = Boolean(b.imagen?.src);
  return (
    <div
      aria-hidden={compacta ? true : undefined}
      className={`relative isolate overflow-hidden rounded-lg ${conFoto ? "bg-banner-oscuro text-papel" : t.panel} ${
        compacta ? "aspect-[16/9] p-3 sm:aspect-[16/7]" : "min-h-64 p-5 sm:p-7"
      } flex flex-col justify-end`}
    >
      {conFoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- medio del propio panel */}
          <img
            src={b.imagen!.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-banner-oscuro/90 via-banner-oscuro/55 to-banner-oscuro/10" />
        </>
      )}
      <p
        className={`font-bold text-balance ${compacta ? "line-clamp-2 hidden text-sm leading-snug sm:block" : "text-xl leading-tight sm:text-2xl"}`}
      >
        {b.titulo || "Título del banner"}
      </p>
      {!compacta && (
        <p
          className={`mt-2 max-w-prose text-sm sm:text-base ${conFoto ? "text-papel/90" : t.texto}`}
        >
          {b.texto || "Texto del banner."}
        </p>
      )}
      {!compacta && (
        <span
          className={`mt-4 inline-flex w-fit items-center gap-2 rounded-control px-4 py-2 text-sm font-semibold ${conFoto ? "bg-papel text-tinta" : t.boton}`}
        >
          {b.enlace.etiqueta || "Texto del botón"}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

const NOMBRE_VIGENCIA: Record<Vigencia, string> = {
  VIGENTE: "Vigente",
  FUTURO: "Programado",
  VENCIDO: "Vencido",
};

const TRAMO = { VIGENTE: "PUBLICADO", FUTURO: "PROGRAMADO", VENCIDO: "DESPUBLICADO" } as const;

/** La vigencia con el tramo (vigente lleno, programado hasta estación hueca, vencido cortado). */
export function EtiquetaVigencia({
  estado,
  vigencia,
}: {
  estado: Vigencia;
  vigencia?: Banner["vigencia"];
}) {
  const color =
    estado === "VIGENTE" ? "text-turquesa-texto" : estado === "FUTURO" ? "text-tinta" : "text-gris";
  const detalle =
    estado === "FUTURO" && vigencia?.desde
      ? `desde el ${formatearDia(vigencia.desde)}`
      : estado === "VENCIDO" && vigencia?.hasta
        ? `terminó el ${formatearDia(vigencia.hasta)}`
        : estado === "VIGENTE" && vigencia?.hasta
          ? `hasta el ${formatearDia(vigencia.hasta)}`
          : estado === "VIGENTE"
            ? "sin fecha final"
            : undefined;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 text-sm font-semibold ${color}`}>
      <TramoEstado estado={TRAMO[estado]} />
      {NOMBRE_VIGENCIA[estado]}
      {detalle && <span className="font-normal text-gris">· {detalle}</span>}
    </span>
  );
}

/** «AAAA-MM-DD» como «20 oct. 2026», sin correr el día por la zona horaria. */
export const formatearDia = (dia: string) => formatearFecha(`${dia}T12:00:00-04:00`);
