import type { TipoTextoLegal } from "@/lib/plataforma/tipos";

/** Las rutas del editor usan el mismo nombre que la página pública del portal. */
export const SLUG_TEXTO: Record<TipoTextoLegal, string> = {
  TERMINOS: "terminos",
  POLITICA_DATOS: "politica-de-datos",
};

export const tipoDeSlug = (slug: string) =>
  (Object.keys(SLUG_TEXTO) as TipoTextoLegal[]).find((t) => SLUG_TEXTO[t] === slug);
