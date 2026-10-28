/*
 * URL de un medio servido por plataforma-api (guía R6): absoluta, pública y estable,
 * `<API_URL>/media/<uuid>.<ext>`. En el servidor también se exige que sea de la API configurada;
 * en el navegador basta la forma (la API vuelve a comprobarlo y responde MEDIO_AJENO).
 */

const FORMA = /^https?:\/\/[^/\s?#]+(?:\/[^\s?#]*)?\/media\/[0-9a-f-]{36}(?:\.[a-z0-9]{2,5})?$/i;

export function esMedioApi(url: string): boolean {
  if (!FORMA.test(url)) return false;
  const base = typeof process !== "undefined" ? process.env.API_URL : undefined;
  if (!base) return true;
  return url.startsWith(`${base.replace(/\/+$/, "")}/media/`);
}
