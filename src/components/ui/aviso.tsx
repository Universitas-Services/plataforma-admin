"use client";

import { AlertCircle, CircleCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type DatosAviso = { tipo: "exito" | "error"; texto: string };

/**
 * Aviso flotante (toast) tras una acción: «Noticia publicada», «No se pudo guardar»…
 * Vive en una región `role="status"` que existe desde el inicio, así el lector de pantalla lo
 * anuncia. Se cierra solo a los 6 s, salvo mientras tenga el puntero o el foco encima; los
 * errores esperan a que la persona los cierre.
 */
export function Aviso({
  aviso,
  onCerrar,
  posicion = "bottom-4 sm:bottom-6",
}: {
  aviso?: DatosAviso;
  onCerrar: () => void;
  /** Distancia al pie: más alta si la pantalla tiene una barra fija abajo. */
  posicion?: string;
}) {
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (!aviso || aviso.tipo === "error" || pausado) return;
    const t = setTimeout(onCerrar, 6000);
    return () => clearTimeout(t);
  }, [aviso, pausado, onCerrar]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 ${posicion}`}
    >
      {aviso && (
        <div
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
          className={`pointer-events-auto flex w-full max-w-md animate-[aparecer_200ms_var(--ease-salida)] items-start gap-3 rounded-lg border bg-papel py-3 pr-2 pl-4 text-sm text-tinta shadow-panel ${
            aviso.tipo === "exito" ? "border-turquesa/40" : "border-peligro/40"
          }`}
        >
          {aviso.tipo === "exito" ? (
            <CircleCheck
              size={18}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-turquesa-texto"
            />
          ) : (
            <AlertCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-peligro" />
          )}
          <p className="min-w-0 flex-1 py-0.5">{aviso.texto}</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el aviso"
            className="grid size-8 shrink-0 place-items-center rounded-control text-gris hover:bg-superficie hover:text-tinta"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Estado de un aviso: `mostrar` lo cambia (un aviso nuevo reemplaza al anterior). */
export function useAviso() {
  const [aviso, setAviso] = useState<DatosAviso>();
  const cerrar = useCallback(() => setAviso(undefined), []);
  return { aviso, mostrar: setAviso, cerrar };
}

/** El aviso de una sola lectura que deja una acción con redirección (cookie pp_aviso). */
export function AvisoInicial({ texto }: { texto?: string }) {
  const { aviso, mostrar, cerrar } = useAviso();
  useEffect(() => {
    if (!texto) return;
    // Tras el primer pintado, para que la región ya exista y se anuncie.
    const t = setTimeout(() => mostrar({ tipo: "exito", texto }), 50);
    return () => clearTimeout(t);
  }, [texto, mostrar]);
  return <Aviso aviso={aviso} onCerrar={cerrar} />;
}
