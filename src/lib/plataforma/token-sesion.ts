import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Token de sesión firmado (HMAC-SHA256). Cualquier instancia del servidor puede validarlo sin
 * memoria compartida: en Netlify cada petición puede caer en una función distinta, y una
 * sesión guardada solo en memoria «desaparecía» y devolvía al inicio de sesión.
 * Con plataforma-api, la cookie guardará el token de la API y este módulo deja de usarse.
 */

export type DatosSesion = {
  /** Usuario. */
  u: string;
  /** Alcaldía en uso. */
  a?: string;
  /** Emitida (epoch ms). */
  e: number;
  /** Vence (epoch ms). */
  v: number;
};

export const DURACION_SESION_MS = 8 * 60 * 60 * 1000;

const firma = (cuerpo: string, secreto: string) =>
  createHmac("sha256", secreto).update(cuerpo).digest("base64url");

export function firmarSesion(
  datos: { usuarioId: string; alcaldiaId?: string },
  secreto: string,
  ahora = Date.now(),
): string {
  const carga: DatosSesion = {
    u: datos.usuarioId,
    a: datos.alcaldiaId,
    e: ahora,
    v: ahora + DURACION_SESION_MS,
  };
  const cuerpo = Buffer.from(JSON.stringify(carga)).toString("base64url");
  return `${cuerpo}.${firma(cuerpo, secreto)}`;
}

/** Devuelve los datos si la firma es válida y no venció; si no, null. */
export function leerSesion(token: string, secreto: string, ahora = Date.now()): DatosSesion | null {
  const [cuerpo, sello, ...resto] = token.split(".");
  if (!cuerpo || !sello || resto.length) return null;
  const esperado = Buffer.from(firma(cuerpo, secreto));
  const recibido = Buffer.from(sello);
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return null;
  try {
    const d = JSON.parse(Buffer.from(cuerpo, "base64url").toString()) as DatosSesion;
    if (typeof d.u !== "string" || typeof d.e !== "number" || typeof d.v !== "number") return null;
    return d.v > ahora ? d : null;
  } catch {
    return null;
  }
}
