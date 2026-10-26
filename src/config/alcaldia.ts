/*
 * La alcaldía de este despliegue. El panel se entrega ya personalizado: otra alcaldía es otro
 * despliegue con otro archivo como este, no una configuración desde la aplicación.
 * Logos, colores y fuentes vienen del portal ciudadano (portal-iribarren).
 */

export const ALCALDIA = {
  id: "iribarren",
  nombre: "Alcaldía del Municipio Iribarren",
  nombreCorto: "Iribarren",
  sigla: "IRI",
  /** Prefijo del folio de las participaciones (IRI-AAAA-NNNN). */
  codigoFolio: "IRI",
  zonaHoraria: "America/Caracas",
  /** Rectángulo que contiene el municipio: la ubicación de una propuesta debe caer dentro. */
  limites: { sur: 9.8, norte: 10.4, oeste: -69.8, este: -69.0 },
  centro: { lat: 10.0678, lng: -69.3467 },
  programa: "PDUL YA",
  portal: "https://pdulya.com",
} as const;

/** Archivos en public/brand, copiados del portal. */
export const LOGOS = {
  /** PDUL YA con la línea divisoria: para fondos claros. */
  horizontal: { src: "/brand/pdul-ya-horizontal-divisor.png", ancho: 1200, alto: 411 },
  /** Isotipo «Catastral Verde»: se lee bien sobre fondo oscuro. */
  isotipo: { src: "/brand/pdul-ya-isotipo.png", ancho: 800, alto: 708 },
  /** Logo de la Alcaldía: texto gris oscuro, solo sobre fondo claro. */
  alcaldia: { src: "/brand/alcaldia-iribarren.png", ancho: 720, alto: 229 },
} as const;
