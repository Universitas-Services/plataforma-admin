import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/*
 * Cookie de sesión con la API: guarda los tokens de plataforma-api cifrados (AES-256-GCM), así
 * el navegador no puede leerlos ni alterarlos. La usan Proxy (para renovar el token antes de
 * cada página) y las Server Actions (al iniciar sesión o cambiar la contraseña). Es la misma
 * pieza del portal (portal-iribarren/src/lib/plataforma-api/sello.ts).
 * No importa `server-only` porque Proxy también lo carga.
 */

export const COOKIE_API = "pp_api";
/** El refresh token de la API dura 30 días; la cookie, lo mismo. */
export const DURACION_COOKIE_S = 30 * 24 * 60 * 60;

export type TokensApi = {
  /** Access token (JWT, 15 min). */
  a: string;
  /** Refresh token (opaco, rota en cada uso). */
  r: string;
  /** Vencimiento del access token (epoch ms). */
  x: number;
  /** Id del usuario en la API. */
  u: string;
};

const clave = (secreto: string) => createHash("sha256").update(`pp-api:${secreto}`).digest();

export function sellar(datos: TokensApi, secreto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", clave(secreto), iv);
  const cuerpo = Buffer.concat([cifra.update(JSON.stringify(datos), "utf8"), cifra.final()]);
  return [iv, cuerpo, cifra.getAuthTag()].map((b) => b.toString("base64url")).join(".");
}

/** Devuelve los tokens si la cookie es auténtica; si fue alterada o es de otro secreto, null. */
export function abrirSello(valor: string, secreto: string): TokensApi | null {
  const [iv, cuerpo, etiqueta, ...resto] = valor.split(".");
  if (!iv || !cuerpo || !etiqueta || resto.length) return null;
  try {
    const descifra = createDecipheriv("aes-256-gcm", clave(secreto), Buffer.from(iv, "base64url"));
    descifra.setAuthTag(Buffer.from(etiqueta, "base64url"));
    const texto = Buffer.concat([
      descifra.update(Buffer.from(cuerpo, "base64url")),
      descifra.final(),
    ]).toString("utf8");
    const d = JSON.parse(texto) as TokensApi;
    return typeof d.a === "string" && typeof d.r === "string" && typeof d.x === "number" ? d : null;
  } catch {
    return null;
  }
}

/** Tokens de la respuesta de login, refresh o cambio de contraseña → contenido de la cookie. */
export function tokensDeRespuesta(
  r: { accessToken: string; refreshToken: string; expiresIn?: number; user: { id: string } },
  ahora = Date.now(),
): TokensApi {
  return {
    a: r.accessToken,
    r: r.refreshToken,
    x: ahora + (r.expiresIn ?? 15 * 60) * 1000,
    u: r.user.id,
  };
}

/** Secreto de la cookie: el mismo de la sesión simulada (SESION_SECRETO). */
export function secretoSesion() {
  return process.env.SESION_SECRETO || "pdul-panel-demo-secreto-no-usar-en-produccion";
}
