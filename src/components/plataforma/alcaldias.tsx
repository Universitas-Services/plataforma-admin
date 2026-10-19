"use client";

import { Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  claseBoton,
  claseCampo,
  EnlaceDemo,
  ErrorCampo,
  Etiqueta,
  useRespuesta,
} from "@/components/alcaldia/comunes";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { crearAlcaldiaAccion, estadoAlcaldiaAccion } from "@/lib/plataforma/acciones-plataforma";

/** «Crear alcaldía»: nombre, sigla y correo de su administrador. */
export function CrearAlcaldia() {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({ nombre: "", sigla: "", correoAdmin: "" });
  const [creada, setCreada] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();

  const campo = (k: keyof typeof datos) => ({
    id: `alcaldia-${k}`,
    value: datos[k],
    onChange: (e: { target: { value: string } }) => setDatos({ ...datos, [k]: e.target.value }),
    "aria-invalid": r.errores[k] ? true : undefined,
    "aria-describedby": r.errores[k] ? `alcaldia-${k}-error` : undefined,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          r.setErrores({});
          r.setEnlace(undefined);
          setCreada(undefined);
          setAbierto(true);
        }}
        className={claseBoton.primario}
      >
        <Building2 size={16} aria-hidden="true" />
        Crear alcaldía
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Crear alcaldía"
        descripcion="Queda en «Onboarding pendiente» hasta que se configure su marca."
        ancho="max-w-lg"
      >
        {creada ? (
          <div className="mt-4">
            <p className="text-cuerpo">La alcaldía ya aparece en la lista.</p>
            <EnlaceDemo enlace={r.enlace} />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className={claseBoton.secundario}
              >
                Cerrar
              </button>
              <Link
                href={`/plataforma/alcaldias?ver=${creada}`}
                onClick={() => setAbierto(false)}
                className={claseBoton.primario}
              >
                Ver su ficha
              </Link>
            </div>
          </div>
        ) : (
          <form
            noValidate
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              iniciar(async () => {
                const respuesta = await crearAlcaldiaAccion(datos);
                if (r.aplicar(respuesta)) {
                  setCreada(respuesta.id);
                  setDatos({ nombre: "", sigla: "", correoAdmin: "" });
                }
              });
            }}
          >
            <div>
              <Etiqueta htmlFor="alcaldia-nombre">Nombre</Etiqueta>
              <input
                {...campo("nombre")}
                maxLength={90}
                placeholder="Alcaldía del Municipio Andrés Eloy Blanco"
                className={`${claseCampo(r.errores.nombre)} h-11`}
              />
              <ErrorCampo id="alcaldia-nombre-error" error={r.errores.nombre} />
            </div>
            <div>
              <Etiqueta htmlFor="alcaldia-sigla">Sigla</Etiqueta>
              <input
                {...campo("sigla")}
                maxLength={4}
                autoComplete="off"
                placeholder="AEB"
                className={`${claseCampo(r.errores.sigla)} h-11 max-w-32 uppercase`}
              />
              <p className="mt-1 text-sm text-gris">
                De 2 a 4 letras. Rotula la alcaldía en el panel.
              </p>
              <ErrorCampo id="alcaldia-sigla-error" error={r.errores.sigla} />
            </div>
            <div>
              <Etiqueta htmlFor="alcaldia-correoAdmin">Correo del administrador</Etiqueta>
              <input
                {...campo("correoAdmin")}
                type="email"
                autoComplete="off"
                className={`${claseCampo(r.errores.correoAdmin)} h-11`}
              />
              <ErrorCampo id="alcaldia-correoAdmin-error" error={r.errores.correoAdmin} />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className={claseBoton.secundario}
              >
                Cancelar
              </button>
              <button type="submit" disabled={pendiente} className={claseBoton.primario}>
                {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
                Crear alcaldía
              </button>
            </div>
          </form>
        )}
      </Dialogo>
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </>
  );
}

/** Suspender (con motivo) o reactivar una alcaldía. */
export function EstadoAlcaldia({
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

  const enviar = () =>
    iniciar(async () => {
      if (r.aplicar(await estadoAlcaldiaAccion(id, !suspendida, motivo))) {
        setAbierto(false);
        setMotivo("");
      }
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          r.setErrores({});
          setAbierto(true);
        }}
        className={suspendida ? claseBoton.secundario : claseBoton.peligro}
      >
        {suspendida ? "Reactivar" : "Suspender"}
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={suspendida ? `Reactivar ${nombre}` : `Suspender ${nombre}`}
        descripcion={
          suspendida
            ? "Su equipo vuelve a entrar al panel."
            : "Su equipo deja de entrar al panel. Los datos se conservan."
        }
      >
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          {!suspendida && (
            <div>
              <Etiqueta htmlFor="motivo-alcaldia">Motivo</Etiqueta>
              <textarea
                id="motivo-alcaldia"
                rows={3}
                maxLength={300}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                aria-invalid={r.errores.motivo ? true : undefined}
                className={claseCampo(r.errores.motivo)}
              />
              <ErrorCampo id="motivo-alcaldia-error" error={r.errores.motivo} />
            </div>
          )}
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
