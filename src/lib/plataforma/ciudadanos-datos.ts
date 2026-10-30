import "server-only";
import { redirect } from "next/navigation";
import { ErrorApi, usaApi } from "@/lib/api/cliente";
import { listarCiudadanosApi, obtenerCiudadanoApi } from "@/lib/api/ciudadanos";
import { aportesDe, ciudadanoDe, ciudadanosDe, type FiltrosCiudadanos } from "./alcaldia";
import { almacen } from "./sesion";
import type { Ciudadano } from "./tipos";

/*
 * Lecturas de Ciudadanos en los dos modos: con plataforma-api (guía R13) o con el almacén
 * simulado. Las páginas reciben las mismas formas en los dos casos.
 */

export const POR_PAGINA_CIUDADANOS = 50;

function sinAcceso(estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE"): never {
  if (estado === "SIN_SESION") redirect("/ingresar");
  throw new ErrorApi(403, "FORBIDDEN", "Tu rol no puede ver los ciudadanos de esta alcaldía.");
}

export type PaginaCiudadanos = {
  items: Ciudadano[];
  total: number;
  pagina: number;
  paginas: number;
  /** Por estado de la cuenta, con los demás filtros. */
  conteos: Record<"ACTIVA" | "SUSPENDIDA", number>;
  /** Bajas pedidas por atender (sin filtros). */
  bajas: number;
};

export async function leerCiudadanos(
  alcaldiaId: string,
  f: FiltrosCiudadanos,
  pagina = 1,
): Promise<PaginaCiudadanos> {
  if (usaApi()) {
    const r = await listarCiudadanosApi(f, pagina, POR_PAGINA_CIUDADANOS);
    if (r.estado !== "OK") sinAcceso(r.estado);
    return r;
  }
  const alm = almacen();
  const lista = ciudadanosDe(alm, alcaldiaId, f);
  const sinCuenta = ciudadanosDe(alm, alcaldiaId, { ...f, membresia: undefined });
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA_CIUDADANOS));
  const actual = Math.min(Math.max(1, pagina), paginas);
  return {
    items: lista.slice((actual - 1) * POR_PAGINA_CIUDADANOS, actual * POR_PAGINA_CIUDADANOS),
    total: lista.length,
    pagina: actual,
    paginas,
    conteos: {
      ACTIVA: sinCuenta.filter((c) => c.membresia.estado === "ACTIVA").length,
      SUSPENDIDA: sinCuenta.filter((c) => c.membresia.estado === "SUSPENDIDA").length,
    },
    bajas: ciudadanosDe(alm, alcaldiaId, { baja: "solicitada" }).length,
  };
}

/** Un ciudadano con sus aportes, o undefined si no existe. */
export async function leerCiudadano(
  alcaldiaId: string,
  id: string,
): Promise<Ciudadano | undefined> {
  if (usaApi()) {
    const r = await obtenerCiudadanoApi(id);
    if (r.estado === "NO_EXISTE") return undefined;
    if (r.estado !== "OK") sinAcceso(r.estado);
    return r.ciudadano;
  }
  const alm = almacen();
  const c = ciudadanoDe(alm, alcaldiaId, id);
  if (!c) return undefined;
  return {
    ...c,
    participaciones: aportesDe(alm, c).map((p) => ({
      folio: p.folio,
      tipo: p.tipo,
      estado: p.estado,
      recibidaEl: p.recibidaEl,
    })),
  };
}
