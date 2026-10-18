"use client";

import type { CSSProperties } from "react";
import { variablesMarca } from "@/lib/marca";

/**
 * Vista previa en vivo de cómo verá el equipo el panel con esta marca: la línea con sus
 * estaciones, la franja «Operando en», un chip y el botón primario. Usa las mismas variables
 * que el marco real (src/lib/marca.ts).
 */
export function VistaPreviaMarca({
  primario,
  secundario,
  logo,
  lema,
  nombre,
  sigla,
}: {
  primario?: string;
  secundario?: string;
  logo?: string;
  lema?: string;
  nombre: string;
  sigla: string;
}) {
  const estilo = variablesMarca(primario) as CSSProperties;
  const corto = nombre.replace(/^Alcaldía del Municipio /, "");
  return (
    <figure
      style={estilo}
      aria-label="Vista previa del panel con esta marca"
      className="self-start overflow-hidden rounded-lg border border-linea bg-papel lg:sticky lg:top-20"
    >
      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] text-xs sm:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="border-r border-linea bg-superficie pb-4">
          <div className="px-3 pt-3 pb-2">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local o del borrador
              <img
                src={logo}
                alt=""
                aria-hidden="true"
                className="mb-1.5 size-7 rounded object-contain"
              />
            )}
            <span className="flex items-start gap-1.5">
              <span className="shrink-0 rounded bg-marca px-1 py-0.5 font-bold tracking-wider text-sobre-marca">
                {sigla}
              </span>
              <span className="leading-tight font-bold break-words text-tinta">Línea {corto}</span>
            </span>
          </div>
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-[1.0625rem] w-[3px] bg-marca"
            />
            {["Tablero", "Participaciones", "Contenido"].map((e, i) => (
              <div
                key={e}
                className={`relative flex h-7 items-center pl-8 text-tinta ${i === 0 ? "mr-2 rounded-r bg-papel font-bold" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 -translate-y-1/2 rounded-full ${
                    i === 0
                      ? "left-[0.6875rem] size-3.5 border-2 border-papel bg-marca shadow-[0_0_0_1.5px_var(--marca)]"
                      : "left-[0.8125rem] size-2 border-2 border-marca bg-papel"
                  }`}
                />
                {e}
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="relative flex h-8 items-center gap-1.5 border-b border-linea pr-2 pl-3">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-marca" />
            <span className="text-gris">Operando en:</span>
            <strong className="truncate text-tinta">{corto}</strong>
          </div>
          <div className="space-y-2.5 p-3">
            <div>
              <p className="text-sm leading-tight font-bold text-tinta">Tablero</p>
              <p className="mt-0.5 text-gris">
                {nombre}
                {lema && <> · {lema}</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-tinta px-2 py-0.5 font-medium text-papel">
                Pendientes 12
              </span>
              <span className="rounded-full border border-linea px-2 py-0.5 text-tinta">
                Publicadas 31
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-marca px-2.5 py-1 font-semibold text-sobre-marca">
                Revisar la más antigua
              </span>
              <span className="font-semibold text-marca-texto underline underline-offset-2">
                Ver la bandeja
              </span>
              {secundario && (
                <span className="inline-flex items-center gap-1 text-gris">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-sm"
                    style={{ background: secundario }}
                  />
                  Secundario
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="border-t border-linea bg-cabecera px-3 py-2 text-xs text-gris">
        Así lo verá tu equipo
      </figcaption>
    </figure>
  );
}
