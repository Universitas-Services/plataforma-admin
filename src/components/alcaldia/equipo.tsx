"use client";

import { Loader2, Mail, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import {
  activarMiembroAccion,
  editarRolesAccion,
  invitarMiembroAccion,
  reenviarInvitacionAccion,
} from "@/lib/plataforma/acciones-alcaldia";
import type { EstadoMiembro } from "@/lib/plataforma/alcaldia";
import type { RolAlcaldia } from "@/lib/plataforma/tipos";
import { claseBoton, claseCampo, EnlaceDemo, ErrorCampo, Etiqueta, useRespuesta } from "./comunes";

const ROLES = [
  { valor: "OPERADOR", texto: "Operador", detalle: "Noticias, documentos, Inicio y proceso" },
  { valor: "REVISOR", texto: "Revisor", detalle: "Verifica, rechaza y publica los aportes" },
] as const;

function CasillasRoles({
  marcados,
  onCambio,
  error,
}: {
  marcados: string[];
  onCambio: (r: string[]) => void;
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? "roles-error" : undefined}>
      <legend className="mb-1.5 text-sm font-bold text-tinta">Roles</legend>
      <div className="space-y-2">
        {ROLES.map((r) => (
          <label
            key={r.valor}
            className="flex cursor-pointer items-start gap-3 rounded-control border border-linea p-3 has-[:checked]:border-marca-texto has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marca-texto"
          >
            <input
              type="checkbox"
              checked={marcados.includes(r.valor)}
              onChange={(e) =>
                onCambio(
                  e.target.checked ? [...marcados, r.valor] : marcados.filter((x) => x !== r.valor),
                )
              }
              className="mt-0.5 size-4 accent-[var(--marca)]"
            />
            <span>
              <span className="block font-semibold text-tinta">{r.texto}</span>
              <span className="block text-sm text-gris">{r.detalle}</span>
            </span>
          </label>
        ))}
      </div>
      <ErrorCampo id="roles-error" error={error} />
    </fieldset>
  );
}

/** «Invitar»: correo y roles (Operador y/o Revisor). */
export function InvitarMiembro() {
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          r.setEnlace(undefined);
          r.setErrores({});
          setAbierto(true);
        }}
        className={claseBoton.primario}
      >
        <UserPlus size={16} aria-hidden="true" />
        Invitar
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Invitar al equipo"
        descripcion="Recibirá un enlace para crear su contraseña. Vence en 72 horas."
      >
        {r.enlace ? (
          <div className="mt-4">
            <EnlaceDemo enlace={r.enlace} />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className={claseBoton.primario}
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              iniciar(async () => {
                const respuesta = await invitarMiembroAccion(correo, roles);
                if (r.aplicar(respuesta)) {
                  setCorreo("");
                  setRoles([]);
                  // En la demo el diálogo queda abierto para mostrar el enlace de la invitación.
                  if (!respuesta.enlace) setAbierto(false);
                }
              });
            }}
          >
            <div>
              <Etiqueta htmlFor="invitar-correo">Correo</Etiqueta>
              <input
                id="invitar-correo"
                type="email"
                autoComplete="off"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                aria-invalid={r.errores.correo ? true : undefined}
                aria-describedby={r.errores.correo ? "invitar-correo-error" : undefined}
                className={`${claseCampo(r.errores.correo)} h-10`}
              />
              <ErrorCampo id="invitar-correo-error" error={r.errores.correo} />
            </div>
            <CasillasRoles marcados={roles} onCambio={setRoles} error={r.errores.roles} />
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
                Enviar invitación
              </button>
            </div>
          </form>
        )}
      </Dialogo>
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </>
  );
}

/** «Gestionar»: roles, activar o desactivar y reenviar la invitación de un miembro. */
export function GestionarMiembro({
  id,
  nombre,
  roles,
  estado,
}: {
  id: string;
  nombre: string;
  roles: RolAlcaldia[];
  estado: EstadoMiembro;
}) {
  const [abierto, setAbierto] = useState(false);
  const [marcados, setMarcados] = useState<string[]>(roles);
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();

  const correr = (accion: () => Promise<Parameters<typeof r.aplicar>[0]>, cerrar = true) =>
    iniciar(async () => {
      if (r.aplicar(await accion()) && cerrar) setAbierto(false);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMarcados(roles);
          r.setErrores({});
          setAbierto(true);
        }}
        className={claseBoton.enlace}
      >
        Gestionar<span className="sr-only"> a {nombre}</span>
      </button>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={`Gestionar a ${nombre}`}
      >
        <div className="mt-4 space-y-5">
          <CasillasRoles marcados={marcados} onCambio={setMarcados} error={r.errores.roles} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pendiente}
              onClick={() => correr(() => editarRolesAccion(id, marcados))}
              className={claseBoton.primario}
            >
              {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
              Guardar roles
            </button>
            {estado === "INVITADO" && (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => correr(() => reenviarInvitacionAccion(id), false)}
                className={claseBoton.secundario}
              >
                <Mail size={16} aria-hidden="true" />
                Reenviar invitación
              </button>
            )}
          </div>
          <EnlaceDemo enlace={r.enlace} />
          {estado !== "INVITADO" && (
            <div className="border-t border-fila pt-4">
              <p className="mb-2 text-sm text-gris">
                {estado === "ACTIVO"
                  ? "Al desactivarlo deja de entrar a esta alcaldía; su historial se conserva."
                  : "Vuelve a darle acceso a esta alcaldía con los roles marcados."}
              </p>
              <button
                type="button"
                disabled={pendiente}
                onClick={() => correr(() => activarMiembroAccion(id, estado !== "ACTIVO"))}
                className={estado === "ACTIVO" ? claseBoton.peligro : claseBoton.secundario}
              >
                {estado === "ACTIVO" ? "Desactivar" : "Activar"}
              </button>
            </div>
          )}
        </div>
      </Dialogo>
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </>
  );
}
