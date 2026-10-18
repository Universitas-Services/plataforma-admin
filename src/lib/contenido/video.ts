/* Copia de portal-iribarren/src/lib/noticias/video.ts: el admin valida con las mismas reglas que el portal. */

/**
 * Saca el identificador de un enlace de YouTube (watch, youtu.be, shorts o embed).
 * Devuelve undefined si el enlace no es de YouTube o el id no tiene la forma esperada,
 * para no incrustar nunca una URL arbitraria.
 */
export function idYoutube(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  let id: string | null | undefined;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      u.pathname === "/watch"
        ? u.searchParams.get("v")
        : u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : undefined;
}

/** URL del reproductor sin cookies, con reproducción al abrir (la persona ya pulsó «play»). */
export const urlEmbedYoutube = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

export type EnlaceVideo = { fuente: "YOUTUBE" | "INSTAGRAM"; url: string };

/**
 * Reconoce un enlace de video de YouTube o de una publicación de Instagram (p, reel o tv) y lo
 * devuelve normalizado. Cualquier otro enlace da undefined: el portal no guarda URLs arbitrarias.
 */
export function enlaceVideo(texto: string): EnlaceVideo | undefined {
  const url = texto.trim();
  const id = idYoutube(url);
  if (id) return { fuente: "YOUTUBE", url: `https://www.youtube.com/watch?v=${id}` };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  const codigo = u.pathname.match(/^\/(p|reel|reels|tv)\/([\w-]+)\/?$/);
  if (host === "instagram.com" && u.protocol === "https:" && codigo) {
    const tipo = codigo[1] === "reels" ? "reel" : codigo[1];
    return { fuente: "INSTAGRAM", url: `https://www.instagram.com/${tipo}/${codigo[2]}/` };
  }
  return undefined;
}
