import {
  fechaFiltro,
  ORDENES_BANDEJA,
  type FiltrosBandeja,
  type OrdenBandeja,
} from "./participaciones";
import { ESTADOS_PARTICIPACION, TIPOS_PARTICIPACION, type TipoParticipacion } from "./tipos";

type Parametros = Record<string, string | string[] | undefined>;

/**
 * Los filtros de la bandeja desde la URL, validados: los mismos para la página, la exportación y
 * la API. `qs` es la consulta limpia (sin la página), para el enlace de exportar y la paginación.
 */
export function filtrosDeBandeja(sp: Parametros) {
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const estado = ESTADOS_PARTICIPACION.find((e) => e === texto("estado"));
  const tipo = Object.hasOwn(TIPOS_PARTICIPACION, texto("tipo"))
    ? (texto("tipo") as TipoParticipacion)
    : undefined;
  const orden = Object.hasOwn(ORDENES_BANDEJA, texto("orden"))
    ? (texto("orden") as OrdenBandeja)
    : undefined;
  let desde = fechaFiltro(texto("desde"));
  let hasta = fechaFiltro(texto("hasta"));
  if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde];
  const filtros: FiltrosBandeja = {
    estado,
    tipo,
    parroquia: texto("parroquia").slice(0, 100) || undefined,
    categoria: texto("categoria").slice(0, 100) || undefined,
    q: texto("q").slice(0, 80) || undefined,
    desde,
    hasta,
    // «Por atender» es el orden de siempre: no hace falta en la URL.
    orden: orden === "atender" ? undefined : orden,
  };
  const pagina = Math.max(1, Math.min(10_000, Number.parseInt(texto("pagina"), 10) || 1));
  const qs = new URLSearchParams(
    Object.entries(filtros).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  return { filtros, pagina, qs };
}
