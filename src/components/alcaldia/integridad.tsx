"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { verificarIntegridadAccion } from "@/lib/plataforma/acciones-alcaldia";
import { claseBoton, useRespuesta } from "./comunes";

/** Recalcula la cadena de hashes de la bitácora y avisa si algún evento fue alterado. */
export function VerificarIntegridad() {
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();
  return (
    <>
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            r.aplicar(await verificarIntegridadAccion());
          })
        }
        className={claseBoton.secundario}
      >
        {pendiente ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : (
          <ShieldCheck size={16} aria-hidden="true" />
        )}
        Verificar integridad
      </button>
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </>
  );
}
