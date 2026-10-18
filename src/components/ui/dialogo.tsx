"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Diálogo modal nativo (adaptado del portal): el navegador atrapa el foco, Escape lo cierra y
 * el resto de la página queda inerte. Al cerrarse, el foco vuelve al control que lo abrió.
 * Solo para lo que necesita interrumpir: confirmar acciones irreversibles o formularios cortos.
 */
export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  ancho = "max-w-md",
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  /** Clase de ancho máximo (la vista previa de una noticia necesita más que una confirmación). */
  ancho?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescripcion = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onClose={onCerrar}
      onClick={(e) => {
        // Clic en el fondo: cierra.
        if (e.target === ref.current) onCerrar();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${ancho} rounded-lg bg-papel p-0 text-cuerpo shadow-panel backdrop:bg-tinta/50`}
    >
      <div className="p-6">
        <h2 id={idTitulo} className="text-lg font-bold">
          {titulo}
        </h2>
        {descripcion && (
          <p id={idDescripcion} className="mt-1 text-sm text-gris">
            {descripcion}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
