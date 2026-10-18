"use client";

import { SlidersHorizontal } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/**
 * En el teléfono, los selectores de filtro quedan detrás de un botón para que la cola siga en
 * la primera pantalla; desde 640 px se muestran siempre, en la misma fila del buscador
 * (el contenedor usa `display: contents`). Los campos siguen en el formulario aunque estén
 * plegados, así que sus valores viajan igual al enviar.
 */
export function FiltrosPlegables({ activos, children }: { activos: number; children: ReactNode }) {
  const [abierto, setAbierto] = useState(activos > 0);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue sm:hidden"
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        Filtros{activos > 0 && ` (${activos})`}
      </button>
      <div id={id} className={`${abierto ? "grid gap-3" : "hidden"} col-span-2 sm:contents`}>
        {children}
      </div>
    </>
  );
}
