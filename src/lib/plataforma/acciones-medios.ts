"use server";

import { pedirApi, usaApi } from "@/lib/api/cliente";
import { mensajeDeError } from "@/lib/api/errores";
import { tokensDeCookie } from "@/lib/api/sesion-api";
import { CLASES_MEDIO, type ClaseMedio } from "@/lib/contenido/tipos";

/*
 * Dónde sube el navegador un medio (guía R6). Con plataforma-api, el BFF pide un ticket de un
 * solo uso (POST /admin/media/uploads) y el navegador sube el archivo directo a la API: las
 * funciones de Netlify no aceptan cuerpos de más de 6 MB. Sin la API, al route simulado.
 */

export type DestinoSubida = { ok: true; url: string; api: boolean } | { ok: false; error: string };

export async function destinoSubidaAccion(
  clase: ClaseMedio,
  nombre: string,
  bytes: number,
): Promise<DestinoSubida> {
  if (!usaApi()) return { ok: true, url: "/api/medios", api: false };
  if (!CLASES_MEDIO.includes(clase)) return { ok: false, error: "Tipo de archivo no válido." };
  const t = await tokensDeCookie();
  if (!t) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };
  try {
    const r = await pedirApi<{ uploadUrl: string }>("/admin/media/uploads", {
      token: t.a,
      cuerpo: { clase, nombre: nombre.slice(0, 200), bytes },
    });
    return { ok: true, url: r.uploadUrl, api: true };
  } catch (e) {
    return { ok: false, error: mensajeDeError(e) };
  }
}
