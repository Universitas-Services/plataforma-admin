import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ErrorApi, usaApi } from "@/lib/api/cliente";
import {
  filaDeApi,
  listarParticipacionesApi,
  obtenerParticipacionApi,
  participacionDeFila,
  todasLasFilasApi,
} from "@/lib/api/participaciones";
import {
  bandeja,
  conteosBandeja,
  fila,
  participacionDe,
  resumenParticipaciones,
  type ConteosBandeja,
  type FiltrosBandeja,
} from "./participaciones";
import { almacen } from "./sesion";
import type { EstadoParticipacion, Participacion, ParticipacionDemo } from "./tipos";

/*
 * Lecturas de la bandeja del Revisor en los dos modos: con plataforma-api (guía R11) o con el
 * almacén simulado. Las páginas reciben las mismas formas en los dos casos.
 */

export const POR_PAGINA_BANDEJA = 50;

/** Un fallo de la API al leer: sin sesión, a ingresar; sin permiso, la página de error. */
function sinAcceso(estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE"): never {
  if (estado === "SIN_SESION") redirect("/ingresar");
  throw new ErrorApi(403, "FORBIDDEN", "Tu rol no puede evaluar aportes en esta alcaldía.");
}

export type PaginaBandeja = {
  filas: ParticipacionDemo[];
  conteos: ConteosBandeja;
  total: number;
  pagina: number;
  paginas: number;
};

export async function leerBandeja(
  alcaldiaId: string,
  f: FiltrosBandeja,
  pagina = 1,
): Promise<PaginaBandeja> {
  if (usaApi()) {
    const r = await listarParticipacionesApi(f, pagina, POR_PAGINA_BANDEJA);
    if (r.estado !== "OK") sinAcceso(r.estado);
    const ahora = Date.now();
    return {
      filas: r.filas.map((x) => filaDeApi(x, ahora)),
      conteos: r.meta.conteos,
      total: r.meta.total,
      pagina: r.meta.page,
      paginas: Math.max(1, r.meta.totalPages),
    };
  }
  const alm = almacen();
  const lista = bandeja(alm, alcaldiaId, f);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA_BANDEJA));
  const actual = Math.min(Math.max(1, pagina), paginas);
  const ahora = Date.now();
  return {
    filas: lista
      .slice((actual - 1) * POR_PAGINA_BANDEJA, actual * POR_PAGINA_BANDEJA)
      .map((p) => fila(p, ahora)),
    conteos: conteosBandeja(alm, alcaldiaId, f),
    total: lista.length,
    pagina: actual,
    paginas,
  };
}

/** Una participación de la alcaldía, o undefined si no existe. */
export async function leerParticipacion(
  alcaldiaId: string,
  folio: string,
): Promise<Participacion | undefined> {
  if (!usaApi()) return participacionDe(almacen(), alcaldiaId, folio);
  const r = await obtenerParticipacionApi(folio);
  if (r.estado === "NO_EXISTE") return undefined;
  if (r.estado !== "OK") sinAcceso(r.estado);
  return r.participacion;
}

/**
 * Conteos por estado y la cola de las 4 que más esperan, para el Tablero. Con la API, una sola
 * página ordenada «por atender».
 */
export async function resumenBandeja(
  alcaldiaId: string,
): Promise<{ conteos: Record<EstadoParticipacion, number>; cola: ParticipacionDemo[] }> {
  if (!usaApi()) {
    const r = resumenParticipaciones(almacen(), alcaldiaId);
    return { conteos: r.conteos, cola: r.cola.slice(0, 4) };
  }
  const r = await listarParticipacionesApi({ orden: "atender" }, 1, 4);
  if (r.estado !== "OK") sinAcceso(r.estado);
  const ahora = Date.now();
  return {
    conteos: r.meta.conteos.estado,
    cola: r.filas
      .filter((x) => x.estado === "PENDIENTE" || x.estado === "EN_REVISION")
      .map((x) => filaDeApi(x, ahora)),
  };
}

/**
 * Cuántas esperan (pendientes y en revisión), para el contador del menú. Una vez por petición;
 * si la API no responde, el menú sigue sin contador.
 */
export const porAtender = cache(async (alcaldiaId: string): Promise<number> => {
  if (!usaApi()) {
    const c = conteosBandeja(almacen(), alcaldiaId).estado;
    return c.PENDIENTE + c.EN_REVISION;
  }
  try {
    const r = await listarParticipacionesApi({}, 1, 1);
    return r.estado === "OK"
      ? r.meta.conteos.estado.PENDIENTE + r.meta.conteos.estado.EN_REVISION
      : 0;
  } catch {
    return 0;
  }
});

/**
 * Con la API, todas las participaciones (sin historial) para las métricas del Tablero, hasta que
 * R13 las dé calculadas. Sin la API, undefined: las métricas leen el almacén.
 */
export async function participacionesParaMetricas(): Promise<Participacion[] | undefined> {
  if (!usaApi()) return undefined;
  const r = await todasLasFilasApi();
  if (r.estado !== "OK") sinAcceso(r.estado);
  return r.filas.map(participacionDeFila);
}
