"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { ALCALDIA } from "@/config/alcaldia";
import {
  dentroDelMunicipio,
  enlaceGoogleMaps,
  formatoCoordenadas,
  type Ubicacion,
} from "@/lib/ubicacion";

/*
 * Dónde aplica el aporte, en un mapa de solo lectura (Leaflet + teselas de OpenStreetMap, con su
 * atribución), igual que el portal. Para teclado y lector de pantalla, las coordenadas y el enlace
 * a Google Maps van en texto debajo del mapa.
 */

const TESELAS = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

const PIN_HTML = `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43s14-14.6 14-25.5C31 8.9 24.7 2 17 2S3 8.9 3 17.5C3 28.4 17 43 17 43z" fill="#e11d48" stroke="#fff" stroke-width="3"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg>`;

export function MapaUbicacion({ punto }: { punto: Ubicacion }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const { lat, lng } = punto;

  useEffect(() => {
    let vivo = true;
    let mapa: Leaflet.Map | undefined;
    void import("leaflet").then((L) => {
      if (!vivo || !contenedor.current) return;
      const l = ALCALDIA.limites;
      mapa = L.map(contenedor.current, {
        center: { lat, lng },
        zoom: 16,
        minZoom: 11,
        maxBounds: [
          [l.sur, l.oeste],
          [l.norte, l.este],
        ],
        maxBoundsViscosity: 0.8,
        scrollWheelZoom: false,
        keyboard: false,
      });
      L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19 })
        // Las teselas son decorativas: el punto va en texto bajo el mapa.
        .on("tileloadstart", (e) => e.tile.setAttribute("aria-hidden", "true"))
        .addTo(mapa);
      mapa.attributionControl.setPrefix(
        '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>',
      );
      L.marker(
        { lat, lng },
        {
          icon: L.divIcon({
            html: PIN_HTML,
            className: "",
            iconSize: [34, 44],
            iconAnchor: [17, 43],
          }),
          keyboard: false,
          interactive: false,
        },
      ).addTo(mapa);
    });
    return () => {
      vivo = false;
      mapa?.remove();
    };
  }, [lat, lng]);

  return (
    <div>
      <div
        ref={contenedor}
        className="isolate h-64 w-full overflow-hidden rounded-control border border-linea bg-superficie sm:h-72"
      />
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-cuerpo tabular-nums">
          <MapPin size={15} aria-hidden="true" className="text-gris" />
          {formatoCoordenadas(punto)}
        </span>
        <a
          href={enlaceGoogleMaps(punto)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1 font-semibold text-marca-texto hover:underline"
        >
          Abrir en Google Maps
          <ExternalLink size={14} aria-hidden="true" />
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      </p>
      {!dentroDelMunicipio(punto) && (
        <p className="mt-2 text-sm font-semibold text-peligro">
          El punto queda fuera del municipio {ALCALDIA.nombreCorto}.
        </p>
      )}
    </div>
  );
}
