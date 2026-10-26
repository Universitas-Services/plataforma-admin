import { ALCALDIA } from "@/config/alcaldia";

/*
 * Ubicación de un aporte: un punto (latitud, longitud) dentro del municipio, como la marca el
 * portal (portal-iribarren/src/lib/ubicacion.ts). Funciones puras: se prueban con Vitest.
 */

export type Ubicacion = { lat: number; lng: number };

export const dentroDelMunicipio = ({ lat, lng }: Ubicacion, l = ALCALDIA.limites) =>
  lat >= l.sur && lat <= l.norte && lng >= l.oeste && lng <= l.este;

/** Enlace de Google Maps para el punto (lo que pide el cliente para el equipo de la alcaldía). */
export const enlaceGoogleMaps = ({ lat, lng }: Ubicacion) =>
  `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

export const formatoCoordenadas = ({ lat, lng }: Ubicacion) =>
  `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
