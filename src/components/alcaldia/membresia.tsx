"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { membresiaAccion } from "@/lib/plataforma/acciones-alcaldia";
import { claseBoton, claseCampo, ErrorCampo, Etiqueta, useRespuesta } from "./comunes";

/**
 * Suspender o reactivar la membresía de un ciudadano en esta alcaldía. Suspender exige el motivo;
 * al reactivar es opcional, como en la API.
 */
export function CambiarMembresia({
  id,
  nombre,
  suspendida,
}: {
  id: string;
  nombre: string;
  suspendida: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();
  const destino = suspendida ? "ACTIVA" : "SUSPENDIDA";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMotivo("");
          r.setErrores({});
          setAbierto(true);
        }}
        className={suspendida ? claseBoton.secundario : claseBoton.peligro}
      >
        {suspendida ? "Reactivar membresía" : "Suspender membresía"}
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={suspendida ? `Reactivar a ${nombre}` : `Suspender a ${nombre}`}
        descripcion={
          suspendida
            ? "Podrá volver a participar en esta alcaldía."
            : "No podrá enviar aportes en esta alcaldía. Sus aportes anteriores se conservan."
        }
      >
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              if (r.aplicar(await membresiaAccion(id, destino, motivo))) setAbierto(false);
            });
          }}
        >
          <div>
            <Etiqueta htmlFor="membresia-motivo">
              {suspendida ? "Motivo (opcional)" : "Motivo"}
            </Etiqueta>
            <textarea
              id="membresia-motivo"
              rows={3}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={r.errores.motivo ? true : undefined}
              aria-describedby="membresia-motivo-ayuda"
              className={claseCampo(r.errores.motivo)}
            />
            <p id="membresia-motivo-ayuda" className="mt-1 text-sm text-gris">
              {suspendida
                ? "Queda en la bitácora. Si lo escribes, de 10 a 500 caracteres."
                : "Queda en la bitácora. De 10 a 500 caracteres."}
            </p>
            <ErrorCampo id="membresia-motivo-error" error={r.errores.motivo} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className={claseBoton.secundario}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className={suspendida ? claseBoton.primario : claseBoton.peligro}
            >
              {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
              {suspendida ? "Reactivar" : "Suspender"}
            </button>
          </div>
        </form>
      </Dialogo>
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </>
  );
}
