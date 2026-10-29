"use server";

import { refresh, revalidatePath } from "next/cache";
import { usaApi } from "@/lib/api/cliente";
import { publicarTextoApi } from "@/lib/api/textos-legales";
import { NOTA_MAX, publicarTexto, type ResultadoPublicar } from "./textos-legales";
import { almacen, idSesion } from "./sesion";
import { TIPOS_TEXTO_LEGAL, TITULO_TEXTO_LEGAL, type TipoTextoLegal } from "./tipos";

/*
 * Publicar una versión nueva de los términos de uso o de la política de datos (R15). Solo el
 * Administrador (legal.editar); al publicarla, las personas registradas en el portal deben
 * aceptarla otra vez.
 */

export type RespuestaTexto = { ok: boolean; errores?: Record<string, string>; mensaje: string };

const MENSAJES: Record<Exclude<ResultadoPublicar["estado"], "OK">, RespuestaTexto> = {
  SIN_SESION: {
    ok: false,
    mensaje: "Tu sesión terminó. Vuelve a iniciar sesión para no perder los cambios.",
  },
  SIN_PERMISO: { ok: false, mensaje: "Solo un Administrador puede publicar los textos legales." },
  VACIO: {
    ok: false,
    mensaje: "Revisa los campos marcados.",
    errores: { texto: "Escribe el texto." },
  },
  SIN_NOTA: {
    ok: false,
    mensaje: "Revisa los campos marcados.",
    errores: { nota: "Cuenta qué cambió: lo leerán las personas al aceptarlo." },
  },
  SIN_CAMBIOS: {
    ok: false,
    mensaje: "El texto es igual al vigente: no hay nada que publicar.",
  },
};

export async function publicarTextoLegalAccion(
  tipo: string,
  datos: { html?: unknown; nota?: unknown },
): Promise<RespuestaTexto> {
  if (!(TIPOS_TEXTO_LEGAL as readonly string[]).includes(tipo))
    return { ok: false, mensaje: "Ese texto no existe." };
  const t = tipo as TipoTextoLegal;
  const entrada = {
    html: typeof datos.html === "string" ? datos.html : "",
    nota: typeof datos.nota === "string" ? datos.nota.slice(0, NOTA_MAX) : "",
  };
  const r = usaApi()
    ? await publicarTextoApi(t, entrada)
    : publicarTexto(almacen(), await idSesion(), t, entrada);
  if (r.estado !== "OK") return MENSAJES[r.estado];
  revalidatePath("/configuracion", "layout");
  refresh();
  return {
    ok: true,
    mensaje: `${TITULO_TEXTO_LEGAL[t]}: versión ${r.version.version} publicada. Quien entre al portal tendrá que aceptarla.`,
  };
}
