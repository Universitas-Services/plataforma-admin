"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Linea, type Estacion } from "./linea";

/** Por debajo de 1024 px, la línea se abre como cajón lateral (dialog nativo: foco atrapado). */
export function NavegacionMovil(props: {
  estaciones: Estacion[];
  sigla: string;
  nombreLinea: string;
  demo?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-expanded={abierto}
        className="grid size-11 place-items-center rounded-control text-tinta hover:bg-superficie lg:hidden"
      >
        <Menu size={22} aria-hidden="true" />
        <span className="sr-only">Abrir el menú</span>
      </button>
      <dialog
        ref={ref}
        aria-label="Menú del panel"
        onClose={() => setAbierto(false)}
        onClick={(e) => {
          if (e.target === ref.current) setAbierto(false);
        }}
        className="m-0 h-dvh max-h-dvh w-[17.5rem] max-w-[85vw] bg-superficie p-0 backdrop:bg-tinta/40 open:animate-[entrar_200ms_var(--ease-salida)] lg:hidden"
      >
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-control text-gris hover:bg-papel"
        >
          <X size={20} aria-hidden="true" />
          <span className="sr-only">Cerrar el menú</span>
        </button>
        <Linea {...props} alNavegar={() => setAbierto(false)} />
      </dialog>
    </>
  );
}
