"use client";

import { Loader2, UserX } from "lucide-react";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { anonimizarAccion } from "@/lib/plataforma/acciones-alcaldia";
import { claseBoton, useRespuesta } from "./comunes";

/**
 * Atiende la baja que pidió el ciudadano: anonimiza la cuenta. No se puede deshacer, así que el
 * diálogo dice qué se borra y qué se conserva antes de confirmar.
 */
export function AnonimizarCuenta({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={claseBoton.peligro}>
        <UserX size={16} aria-hidden="true" />
        Anonimizar la cuenta
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={`¿Anonimizar la cuenta de ${nombre}?`}
        descripcion="Atiende la baja que pidió. No se puede deshacer."
      >
        <div className="mt-4 space-y-4 text-sm text-cuerpo">
          <p>
            Se borran su nombre, correo, cédula o RIF, teléfono y ocupación, y se retiran sus
            documentos de identidad. Ya no podrá entrar al portal.
          </p>
          <p>
            Sus aportes se conservan con su folio, sin sus datos personales. Queda en la bitácora.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className={claseBoton.secundario}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  if (r.aplicar(await anonimizarAccion(id))) setAbierto(false);
                })
              }
              className={claseBoton.peligro}
            >
              {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
              Anonimizar
            </button>
          </div>
        </div>
      </Dialogo>
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </>
  );
}
