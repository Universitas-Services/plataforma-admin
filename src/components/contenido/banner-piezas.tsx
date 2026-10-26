import type { Banner, Vigencia } from "@/lib/contenido/tipos";
import { TramoEstado, formatearFecha } from "./estado-noticia";
import { VistaPreviaTarjeta } from "./vista-previa-tarjeta";

/*
 * Piezas de las diapositivas de la tarjeta con transiciones del Inicio: su vista previa (la misma
 * tarjeta del portal) y su vigencia dibujada con el mismo tramo que el estado de las noticias.
 */

/** Fondos del portal por tono, para las miniaturas de la lista. */
const PANEL: Record<Banner["tono"], string> = {
  rojo: "bg-rojo-oscuro text-papel",
  tinta: "bg-noche text-papel",
  calido: "bg-amarillo text-noche",
};

/**
 * Vista previa de una diapositiva: la tarjeta del portal completa, o una miniatura (`compacta`)
 * para la lista.
 */
export function VistaBanner({
  banner: b,
  compacta = false,
}: {
  banner: Pick<Banner, "titulo" | "texto" | "enlace" | "tono" | "imagen">;
  compacta?: boolean;
}) {
  if (!compacta)
    return (
      <VistaPreviaTarjeta
        diapositivas={[
          {
            id: "previa",
            titulo: b.titulo,
            texto: b.texto,
            etiqueta: b.enlace.etiqueta,
            tono: b.tono,
            imagen: b.imagen?.src ? { src: b.imagen.src, alt: b.imagen.alt } : undefined,
          },
        ]}
      />
    );
  const conFoto = Boolean(b.imagen?.src);
  return (
    <div
      aria-hidden="true"
      className={`relative isolate flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-lg p-3 sm:aspect-[16/7] ${
        conFoto ? "bg-noche text-papel" : PANEL[b.tono]
      }`}
    >
      {conFoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- medio del propio panel */}
          <img
            src={b.imagen!.src}
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgb(46_19_77/0.95)_0%,rgb(46_19_77/0.6)_50%,rgb(46_19_77/0.15)_100%)]" />
        </>
      )}
      <p className="line-clamp-2 hidden text-sm leading-snug font-bold text-balance sm:block">
        {b.titulo || "Título de la diapositiva"}
      </p>
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
