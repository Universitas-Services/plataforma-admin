"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { claseBoton, claseCampo, ErrorCampo, Etiqueta } from "@/components/alcaldia/comunes";

/*
 * Piezas de los formularios de R17 (Datos del sitio, encabezado y Registro de actores): un campo
 * de texto con su error y una fila de lista con subir, bajar y quitar.
 */

export function CampoTexto({
  id,
  etiqueta,
  valor,
  onCambio,
  error,
  max,
  opcional,
  multilinea,
  tipo = "text",
  ayuda,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  error?: string;
  max: number;
  opcional?: boolean;
  multilinea?: boolean;
  tipo?: "text" | "email" | "tel" | "url";
  ayuda?: string;
}) {
  const describe = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ");
  const comunes = {
    id,
    value: valor,
    maxLength: max,
    onChange: (e: { target: { value: string } }) => onCambio(e.target.value),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describe || undefined,
    className: claseCampo(error),
  };
  return (
    <div>
      <Etiqueta htmlFor={id} opcional={opcional}>
        {etiqueta}
      </Etiqueta>
      {multilinea ? <textarea rows={3} {...comunes} /> : <input type={tipo} {...comunes} />}
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1 text-sm text-gris">
          {ayuda}
        </p>
      )}
      <ErrorCampo id={`${id}-error`} error={error} />
    </div>
  );
}

/** Una fila de una lista editable, con su número, subir, bajar y quitar. */
export function FilaLista({
  titulo,
  indice,
  total,
  onMover,
  onQuitar,
  children,
}: {
  titulo: string;
  indice: number;
  total: number;
  onMover: (direccion: -1 | 1) => void;
  onQuitar: () => void;
  children: ReactNode;
}) {
  const nombre = `${titulo} ${indice + 1}`;
  return (
    <li className="rounded-lg border border-linea p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-tinta">{nombre}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={indice === 0}
            onClick={() => onMover(-1)}
            aria-label={`Subir ${nombre}`}
            className={claseBoton.enlace}
          >
            <ArrowUp size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={indice === total - 1}
            onClick={() => onMover(1)}
            aria-label={`Bajar ${nombre}`}
            className={claseBoton.enlace}
          >
            <ArrowDown size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onQuitar}
            aria-label={`Quitar ${nombre}`}
            className={claseBoton.enlace}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </li>
  );
}

/** Mueve un elemento de una lista hacia arriba (-1) o hacia abajo (+1). */
export function mover<T>(lista: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const r = [...lista];
  [r[i], r[j]] = [r[j]!, r[i]!];
  return r;
}
