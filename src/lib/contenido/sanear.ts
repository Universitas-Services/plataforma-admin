/*
 * Saneado del HTML del editor (backlog 1.13: «HTML sanitizado en el servidor»). Lista blanca
 * de etiquetas y atributos; todo lo demás se descarta. No depende del DOM: corre en el servidor
 * simulado igual que correría en plataforma-api.
 */

/** Etiquetas que se conservan, con su equivalente (h1 baja a h2, b pasa a strong…). */
const ETIQUETAS: Record<string, string> = {
  p: "p",
  br: "br",
  hr: "hr",
  h1: "h2",
  h2: "h2",
  h3: "h3",
  h4: "h3",
  h5: "h3",
  h6: "h3",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  s: "s",
  ul: "ul",
  ol: "ol",
  li: "li",
  blockquote: "blockquote",
  a: "a",
  img: "img",
};

const VACIAS = new Set(["br", "hr", "img"]);

/** Su contenido se elimina entero, no solo la etiqueta. */
const PELIGROSAS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
  "noscript",
  "textarea",
  "select",
  "title",
];

/** Imágenes solo de los medios del propio panel. */
const ORIGEN_IMAGEN = /^\/(medios\/[\w-]+|ejemplos\/[\w.-]+)$/;

const escapar = (t: string) =>
  t
    .replace(/&(?!#?\w+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escaparAtributo = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Decodifica las entidades que se usan para disfrazar un esquema (`&#106;avascript:`). */
function decodificar(t: string) {
  return t
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;|&newline;/gi, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Enlace permitido: http, https, mailto o una ruta del propio sitio. */
export function enlaceSeguro(href: string): string | undefined {
  const limpio = decodificar(href)
    .replace(/[\u0000- \u007f-\u009f]/g, "")
    .trim();
  if (!limpio) return undefined;
  if (limpio.startsWith("/") && !limpio.startsWith("//")) return limpio;
  const esquema = limpio.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (esquema === "http" || esquema === "https" || esquema === "mailto") return limpio;
  return undefined;
}

function atributos(texto: string) {
  const r: Record<string, string> = {};
  for (const m of texto.matchAll(
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  ))
    r[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return r;
}

export function sanearHtml(html: string): string {
  // Fuera comentarios, CDATA y el contenido completo de las etiquetas peligrosas.
  let entrada = html.replace(/<!--[\s\S]*?(-->|$)/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  for (const t of PELIGROSAS)
    entrada = entrada.replace(new RegExp(`<${t}\\b[\\s\\S]*?(<\\/${t}\\s*>|$)`, "gi"), "");

  const salida: string[] = [];
  const abiertas: string[] = [];
  const marca = /<\s*(\/)?\s*([a-zA-Z][\w-]*)([^>]*)>|<[!?][^>]*>/g;
  let ultimo = 0;

  for (const m of entrada.matchAll(marca)) {
    salida.push(escapar(entrada.slice(ultimo, m.index)));
    ultimo = m.index + m[0].length;
    if (!m[2]) continue; // <!doctype>, <?xml?>…
    const destino = ETIQUETAS[m[2].toLowerCase()];
    if (!destino) continue;

    if (m[1]) {
      // Cierre: cierra también las que quedaron abiertas dentro.
      const i = abiertas.lastIndexOf(destino);
      if (i === -1) continue;
      while (abiertas.length > i) salida.push(`</${abiertas.pop()}>`);
      continue;
    }

    const attrs = atributos(m[3] ?? "");
    if (destino === "a") {
      const href = attrs.href ? enlaceSeguro(attrs.href) : undefined;
      if (!href) continue;
      salida.push(`<a href="${escaparAtributo(href)}" rel="noopener noreferrer">`);
      abiertas.push("a");
    } else if (destino === "img") {
      const src = attrs.src?.trim() ?? "";
      const alt = attrs.alt?.trim();
      if (!ORIGEN_IMAGEN.test(src) || !alt) continue;
      salida.push(`<img src="${src}" alt="${escaparAtributo(decodificar(alt))}">`);
    } else if (VACIAS.has(destino)) {
      salida.push(`<${destino}>`);
    } else {
      salida.push(`<${destino}>`);
      abiertas.push(destino);
    }
  }
  salida.push(escapar(entrada.slice(ultimo)));
  while (abiertas.length) salida.push(`</${abiertas.pop()}>`);

  return salida
    .join("")
    .replace(/<p>\s*<\/p>/g, "")
    .trim();
}

/** Texto plano del cuerpo (para saber si está vacío y para contar palabras). */
export const textoDe = (html: string) =>
  decodificar(html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " "))
    .replace(/\s+/g, " ")
    .trim();
