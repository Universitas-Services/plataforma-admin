"use client";

import { AlertCircle, Upload } from "lucide-react";
import { useState } from "react";
import type { ClaseMedio } from "@/lib/contenido/tipos";
import { ayudaClase } from "./subir";

const ACEPTA: Record<ClaseMedio, string> = {
  imagen: "image/jpeg,image/png,image/webp",
  pdf: "application/pdf",
  video: "video/mp4,video/webm",
  subtitulos: ".vtt,text/vtt",
};

/**
 * Zona para soltar o elegir archivos (mismo patrón que el logo del onboarding): una etiqueta
 * grande que abre el selector, con el input real oculto pero accesible. Muestra el progreso
 * de la subida y el motivo si se rechaza.
 */
export function ZonaArchivo({
  id,
  etiqueta,
  clase,
  onArchivos,
  error,
  progreso,
  multiple = false,
  compacta = false,
  texto,
}: {
  id: string;
  etiqueta: string;
  clase: ClaseMedio;
  onArchivos: (archivos: File[]) => void;
  error?: string;
  /** Fracción subida (0 a 1) mientras hay una subida en curso. */
  progreso?: number;
  multiple?: boolean;
  compacta?: boolean;
  texto?: string;
}) {
  const [encima, setEncima] = useState(false);
  const subiendo = progreso !== undefined;
  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          if (!subiendo) onArchivos([...e.dataTransfer.files]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-5 text-center transition-colors has-[:focus-visible]:border-marca-texto ${
          compacta ? "min-h-24 py-4" : "min-h-36 py-6"
        } ${
          error
            ? "border-peligro bg-peligro-suave"
            : encima
              ? "border-marca-texto bg-marca-suave"
              : "border-linea hover:border-tenue"
        } ${subiendo ? "pointer-events-none opacity-70" : ""}`}
      >
        <Upload size={22} aria-hidden="true" className="text-marca-texto" />
        <span className="font-semibold text-tinta">
          {texto ?? etiqueta}
          <span className="font-normal text-gris">
            {" "}
            · arrastra {multiple ? "los archivos" : "el archivo"} o elige
          </span>
        </span>
        <span id={`${id}-ayuda`} className="text-sm text-gris">
          {ayudaClase(clase)}
        </span>
        <input
          id={id}
          type="file"
          accept={ACEPTA[clase]}
          multiple={multiple}
          disabled={subiendo}
          aria-label={etiqueta}
          aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ""}`}
          aria-invalid={error ? true : undefined}
          className="sr-only"
          onChange={(e) => {
            onArchivos([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </label>
      {subiendo && (
        <div className="mt-2">
          <div
            role="progressbar"
            aria-label={`Subiendo: ${etiqueta}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progreso * 100)}
            className="h-1.5 overflow-hidden rounded-full bg-superficie"
          >
            <div
              className="h-full bg-marca transition-[width] duration-150"
              style={{ width: `${Math.round(progreso * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-gris tabular-nums">
            Subiendo… {Math.round(progreso * 100)} %
          </p>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-peligro">
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
