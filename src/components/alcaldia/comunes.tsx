"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import type { DatosAviso } from "@/components/ui/aviso";
import type { Respuesta } from "@/lib/plataforma/acciones-alcaldia";

/* Piezas comunes de las pantallas del Admin de alcaldía. */

export const claseBoton = {
  primario:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-4 text-sm font-semibold text-sobre-marca hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
  secundario:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-linea bg-papel px-4 text-sm font-semibold text-tinta hover:border-tenue disabled:cursor-not-allowed disabled:opacity-50",
  peligro:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-peligro/40 bg-papel px-4 text-sm font-semibold text-peligro hover:bg-peligro-suave disabled:cursor-not-allowed disabled:opacity-50",
  enlace:
    "inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-marca-texto hover:underline disabled:opacity-50",
};

export const claseCampo = (error?: string) =>
  `w-full rounded-control border bg-papel px-3 py-2 text-[0.9375rem] text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto ${
    error ? "border-peligro" : "border-linea"
  }`;

export function Etiqueta({
  htmlFor,
  children,
  opcional,
}: {
  htmlFor: string;
  children: string;
  opcional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-tinta">
      {children}
      {opcional && <span className="font-normal text-gris"> (opcional)</span>}
    </label>
  );
}

export function ErrorCampo({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-sm text-peligro">
      {error}
    </p>
  );
}

/** Estado común de una acción: aviso flotante, errores por campo y enlace de demostración. */
export function useRespuesta() {
  const [aviso, setAviso] = useState<DatosAviso>();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enlace, setEnlace] = useState<string>();
  function aplicar(r: Respuesta) {
    setAviso({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
    setErrores(r.errores ?? {});
    setEnlace(r.enlace);
    return r.ok;
  }
  return { aviso, setAviso, errores, setErrores, enlace, setEnlace, aplicar };
}

/** En demostración, el enlace de la invitación se muestra en pantalla (no hay correo real). */
export function EnlaceDemo({ enlace }: { enlace?: string }) {
  if (!enlace) return null;
  return (
    <p className="mt-4 rounded-control border border-dashed border-ambar/60 bg-cabecera p-3 text-sm text-cuerpo">
      Solo en la demostración (en producción llega por correo):{" "}
      <a
        href={enlace}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-marca-texto underline"
      >
        abrir la invitación
        <ExternalLink size={14} aria-hidden="true" />
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
    </p>
  );
}
