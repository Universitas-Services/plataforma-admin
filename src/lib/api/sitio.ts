import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import type { Actores, DatosSitio, Encabezado, ResultadoSitio } from "@/lib/plataforma/sitio";

/*
 * Datos del sitio y encabezado del Inicio contra plataforma-api (guía R17):
 * - GET y PUT /admin/site (permiso sitio.editar);
 * - PUT /admin/home/encabezado y PUT /admin/home/actores (permiso inicio.editar); GET /admin/home
 *   los trae junto al mensaje del alcalde.
 * Las fotos tienen la forma de las imágenes de los banners ({src, alt, ancho, alto, credito}): la
 * API comprueba que el archivo sea un medio de la alcaldía (MEDIO_AJENO). Devuelven los mismos
 * resultados que sitio.ts.
 */

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

/** Los errores por campo de la API: un objeto {campo: mensaje} o una lista de mensajes. */
function erroresDeApi(e: ErrorApi): Record<string, string> {
  const d = e.details;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const r: Record<string, string> = {};
    for (const [k, v] of Object.entries(d)) if (typeof v === "string") r[k] = v;
    if (Object.keys(r).length) return r;
  }
  return { formulario: e.message || "Revisa los datos." };
}

function fallo(e: unknown): ResultadoSitio {
  if (e instanceof ErrorApi) {
    if (e.code === "VALIDATION_ERROR") return { estado: "INVALIDO", errores: erroresDeApi(e) };
    if (e.code === "MEDIO_AJENO")
      return {
        estado: "INVALIDO",
        errores: { formulario: "Una de las fotos no es de esta alcaldía." },
      };
    if (e.status === 401) return { estado: "SIN_SESION" };
    if (e.status === 403) return { estado: "SIN_PERMISO" };
  }
  throw e;
}

export async function sitioApi(): Promise<
  { estado: "OK"; sitio: DatosSitio } | { estado: "SIN_SESION" | "SIN_PERMISO" }
> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    return { estado: "OK", sitio: await pedirApi<DatosSitio>("/admin/site", { token: t }) };
  } catch (e) {
    const r = fallo(e);
    return r.estado === "SIN_SESION" || r.estado === "SIN_PERMISO" ? r : { estado: "SIN_PERMISO" };
  }
}

async function poner(ruta: string, cuerpo: unknown): Promise<ResultadoSitio> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    await pedirApi(ruta, { metodo: "PUT", token: t, cuerpo });
    return { estado: "OK" };
  } catch (e) {
    return fallo(e);
  }
}

export const guardarSitioApi = (d: DatosSitio) => poner("/admin/site", d);
export const guardarEncabezadoApi = (d: Encabezado) => poner("/admin/home/encabezado", d);
export const guardarActoresApi = (d: Actores) => poner("/admin/home/actores", d);
