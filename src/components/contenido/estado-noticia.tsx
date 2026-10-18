import {
  FileText,
  Images,
  Image as ImageIcon,
  PlaySquare,
  Type,
  type LucideIcon,
} from "lucide-react";
import { NOMBRE_ESTADO, type EstadoNoticia, type Formato } from "@/lib/contenido/tipos";

export const ICONO_FORMATO: Record<Formato, LucideIcon> = {
  TEXTO: Type,
  IMAGEN: ImageIcon,
  GALERIA: Images,
  DOCUMENTO: FileText,
  VIDEO: PlaySquare,
};

const fechaCorta = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});

const fechaDia = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Caracas",
});

export const formatearFecha = (iso: string, conHora = false) =>
  (conHora ? fechaCorta : fechaDia).format(new Date(iso));

/**
 * El estado de una noticia con el lenguaje de la línea: un tramo corto que se lee por su forma.
 *   Borrador: discontinuo, sin llegar a la estación.
 *   Programada: discontinuo hasta una estación hueca (llegará sola en la fecha).
 *   Publicada: lleno hasta la estación llena, en turquesa.
 *   Despublicada: lleno pero cortado antes de la estación.
 */
export function TramoEstado({ estado }: { estado: EstadoNoticia }) {
  const color =
    estado === "PUBLICADO"
      ? "stroke-turquesa-texto"
      : estado === "PROGRAMADO"
        ? "stroke-tinta"
        : "stroke-gris";
  return (
    <svg width={30} height={12} viewBox="0 0 30 12" aria-hidden="true" className="shrink-0">
      {estado === "BORRADOR" && (
        <path d="M1 6H20" className={`tramo-espera ${color}`} strokeWidth={3} fill="none" />
      )}
      {estado === "PROGRAMADO" && (
        <>
          <path d="M1 6H19" className={`tramo-espera ${color}`} strokeWidth={3} fill="none" />
          <circle cx={24.5} cy={6} r={3.5} className={`fill-papel ${color}`} strokeWidth={2} />
        </>
      )}
      {estado === "PUBLICADO" && (
        <>
          <path d="M1 6H21" className={color} strokeWidth={3} fill="none" />
          <circle cx={24.5} cy={6} r={4} className="fill-turquesa-texto" />
        </>
      )}
      {estado === "DESPUBLICADO" && (
        <>
          <path d="M1 6H14" className={color} strokeWidth={3} fill="none" />
          <path d="M18 1.5V10.5" className={color} strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** Tramo + nombre del estado (y la fecha de publicación si está programada). */
export function EstadoNoticiaEtiqueta({
  estado,
  publicarEl,
}: {
  estado: EstadoNoticia;
  publicarEl?: string;
}) {
  const color =
    estado === "PUBLICADO"
      ? "text-turquesa-texto"
      : estado === "PROGRAMADO"
        ? "text-tinta"
        : "text-gris";
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap ${color}`}
    >
      <TramoEstado estado={estado} />
      {NOMBRE_ESTADO[estado]}
      {estado === "PROGRAMADO" && publicarEl && (
        <span className="font-normal text-gris">· {formatearFecha(publicarEl, true)}</span>
      )}
    </span>
  );
}
