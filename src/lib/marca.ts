/*
 * Capa de marca. El panel es neutro (azul institucional de la plataforma) y, dentro de una
 * alcaldía con onboarding completo, toma su color primario. Para que cualquier color elegido
 * cumpla WCAG AA, de él se derivan:
 *   --marca        el color tal cual (líneas, marcadores, fondos de botón);
 *   --sobre-marca  el texto que va encima (blanco o tinta, el de mejor contraste);
 *   --marca-texto  el mismo tono oscurecido hasta 4.5:1 sobre blanco (textos y bordes de foco);
 *   --marca-suave  un lavado del 10 % para fondos de selección.
 */

export const MARCA_PLATAFORMA = "#1F3864";
const BLANCO = "#FFFFFF";
const TINTA = "#16213A";

type Rgb = [number, number, number];

export function hexARgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as Rgb;
}

const aHex = (rgb: Rgb) =>
  `#${rgb
    .map((c) =>
      Math.round(Math.max(0, Math.min(255, c)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();

function luminancia([r, g, b]: Rgb) {
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste WCAG entre dos colores hex. */
export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(hexARgb(a)), luminancia(hexARgb(b))].sort((m, n) => n - m) as [
    number,
    number,
  ];
  return (x + 0.05) / (y + 0.05);
}

/** Oscurece el color en pasos hasta alcanzar `meta` contra `fondo`. */
export function oscurecerHasta(hex: string, fondo = BLANCO, meta = 4.5) {
  let rgb = hexARgb(hex);
  for (let i = 0; i < 40 && contraste(aHex(rgb), fondo) < meta; i++)
    rgb = rgb.map((c) => c * 0.94) as Rgb;
  return aHex(rgb);
}

export type VariablesMarca = {
  "--marca": string;
  "--sobre-marca": string;
  "--marca-texto": string;
  "--marca-suave": string;
};

/** Variables CSS de la marca activa: la de la alcaldía o, sin ella, la de la plataforma. */
export function variablesMarca(primario = MARCA_PLATAFORMA): VariablesMarca {
  const marca = /^#[0-9a-f]{6}$/i.test(primario) ? primario.toUpperCase() : MARCA_PLATAFORMA;
  const sobre = contraste(marca, BLANCO) >= contraste(marca, TINTA) ? BLANCO : TINTA;
  const [r, g, b] = hexARgb(marca);
  const suave = aHex([r, g, b].map((c) => 255 - (255 - c) * 0.1) as Rgb);
  return {
    "--marca": marca,
    "--sobre-marca": sobre,
    "--marca-texto": oscurecerHasta(marca),
    "--marca-suave": suave,
  };
}

/** ¿El texto sobre la marca llega a AA? (si no, el onboarding sugiere otro tono). */
export const marcaLegible = (primario: string) => {
  const v = variablesMarca(primario);
  return contraste(v["--marca"], v["--sobre-marca"]) >= 4.5;
};

export type EvaluacionMarca = {
  /** Relación del texto sobre la marca (blanco o tinta, el mejor). */
  texto: number;
  /** Relación de la marca contra el fondo blanco: la línea, bordes y marcadores (1.4.11). */
  contraFondo: number;
  ok: boolean;
  /** Si no cumple, el tono más cercano que sí cumple (oscurecido). */
  sugerencia?: string;
};

/**
 * ¿Sirve este color como marca del panel? El texto encima debe llegar a 4.5:1 y la marca
 * misma a 3:1 contra el blanco, para que la línea y los marcadores se vean.
 */
export function evaluarMarca(primario: string): EvaluacionMarca {
  const v = variablesMarca(primario);
  const texto = contraste(v["--marca"], v["--sobre-marca"]);
  const contraFondo = contraste(v["--marca"], BLANCO);
  const ok = texto >= 4.5 && contraFondo >= 3;
  return { texto, contraFondo, ok, sugerencia: ok ? undefined : oscurecerHasta(v["--marca"]) };
}

const coma = (n: number) => n.toFixed(1).replace(".", ",");

/** Explica qué falla de una marca, solo con los chequeos que no cumple. */
export function explicarContraste(e: EvaluacionMarca) {
  const fallas = [
    e.texto < 4.5 && `el texto sobre el color no se lee bien (${coma(e.texto)}:1 de 4,5)`,
    e.contraFondo < 3 && `la línea no se distingue del fondo (${coma(e.contraFondo)}:1 de 3)`,
  ].filter(Boolean);
  return `Con este color ${fallas.join(" y ")}.${e.sugerencia ? ` Prueba con ${e.sugerencia}.` : ""}`;
}
