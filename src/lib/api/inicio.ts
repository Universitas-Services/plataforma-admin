import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { deApi as noticiaDeApi } from "./noticias";
import { tokensDeCookie } from "./sesion-api";
import type { VistaInicio } from "@/lib/plataforma/inicio";
import type { Actores, Encabezado } from "@/lib/plataforma/sitio";

/*
 * Mensaje del alcalde contra plataforma-api (guía R10: GET y PUT /admin/home, permiso
 * inicio.editar). Devuelve la misma VistaInicio que inicio.ts y los mismos códigos
 * (NO_PUBLICADA, NO_ES_TEXTO), así la página y guardarInicioAccion no cambian. `retiradas`
 * funciona como depurarInicio(): el título de la noticia que se despublicó llega una sola vez.
 */

type Fallo = "SIN_SESION" | "SIN_PERMISO" | "NO_PUBLICADA" | "NO_ES_TEXTO";

function fallo(e: unknown): { estado: Fallo } {
  if (e instanceof ErrorApi) {
    if (e.code === "NO_PUBLICADA" || e.code === "NO_ES_TEXTO") return { estado: e.code };
    if (e.status === 401) return { estado: "SIN_SESION" };
    if (e.status === 403) return { estado: "SIN_PERMISO" };
  }
  throw e;
}

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

type NoticiaApi = Parameters<typeof noticiaDeApi>[0];

export async function inicioApi(): Promise<VistaInicio | { estado: Fallo }> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    const r = await pedirApi<{
      mensajeAlcalde: NoticiaApi | null;
      candidatosMensaje: NoticiaApi[];
      retiradas: string[];
      /** R17: sin guardar todavía, la API los omite y el panel usa los valores de hoy. */
      encabezado?: Encabezado | null;
      actores?: Actores | null;
    }>("/admin/home", { token: t });
    return {
      estado: "OK",
      mensajeAlcalde: r.mensajeAlcalde ? noticiaDeApi(r.mensajeAlcalde) : undefined,
      candidatosMensaje: r.candidatosMensaje.map(noticiaDeApi),
      retiradas: r.retiradas ?? [],
      encabezado: r.encabezado ?? undefined,
      actores: r.actores ?? undefined,
    };
  } catch (e) {
    return fallo(e);
  }
}

/** `mensajeAlcalde` es obligatorio en el cuerpo: null quita el mensaje. */
export async function guardarInicioApi(mensajeAlcalde: string | null) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi("/admin/home", { metodo: "PUT", token: t, cuerpo: { mensajeAlcalde } });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}
