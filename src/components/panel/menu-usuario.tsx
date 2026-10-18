"use client";

import { ChevronDown, KeyRound, LogOut, MonitorSmartphone } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  cambiarContrasenaAccion,
  cerrarSesionAccion,
  cerrarTodasAccion,
  type EstadoFormulario,
} from "@/lib/plataforma/acciones";
import { BotonEnviar, CampoContrasena, ResumenErrores } from "@/components/formularios/campos";
import { Dialogo } from "@/components/ui/dialogo";

const opcion =
  "flex min-h-11 w-full items-center gap-2.5 rounded-control px-3 text-left text-[0.9375rem] font-medium text-tinta hover:bg-superficie";

/** Menú de usuario (backlog 2.5): cambiar contraseña, cerrar sesión y cerrar todas. */
export function MenuUsuario({
  nombre,
  rol,
  correo,
}: {
  nombre: string;
  rol: string;
  correo: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [dialogo, setDialogo] = useState<"contrasena" | "todas" | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const abrir = (d: "contrasena" | "todas") => {
    setAbierto(false);
    setDialogo(d);
  };

  return (
    <div ref={caja} className="relative">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((v) => !v)}
        className="flex min-h-11 items-center gap-2.5 rounded-full py-1 pr-2 pl-1 text-left hover:bg-superficie sm:pr-3"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-tinta text-[0.8125rem] font-semibold text-papel"
        >
          {iniciales}
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold text-tinta">{nombre}</span>
          <span className="block text-xs text-gris">{rol}</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-gris transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        />
        <span className="sr-only">Menú de la cuenta</span>
      </button>
      {abierto && (
        <div
          id={id}
          className="absolute right-0 z-40 mt-2 w-72 origin-top-right animate-[aparecer_160ms_var(--ease-salida)] rounded-lg bg-papel p-1.5 shadow-panel ring-1 ring-linea"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="font-semibold text-tinta">{nombre}</p>
            <p className="truncate text-sm text-gris">{correo}</p>
          </div>
          <button type="button" onClick={() => abrir("contrasena")} className={opcion}>
            <KeyRound size={18} aria-hidden="true" className="text-marca-texto" />
            Cambiar contraseña
          </button>
          <button type="button" onClick={() => abrir("todas")} className={opcion}>
            <MonitorSmartphone size={18} aria-hidden="true" className="text-marca-texto" />
            Cerrar todas las sesiones
          </button>
          <form action={cerrarSesionAccion} className="mt-1 border-t border-linea pt-1">
            <button type="submit" className={opcion}>
              <LogOut size={18} aria-hidden="true" className="text-marca-texto" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}

      <Dialogo
        abierto={dialogo === "contrasena"}
        onCerrar={() => setDialogo(null)}
        titulo="Cambiar contraseña"
        descripcion="Al cambiarla, cerramos tu sesión en los demás dispositivos."
      >
        {dialogo === "contrasena" && (
          <FormCambiarContrasena correo={correo} onListo={() => setDialogo(null)} />
        )}
      </Dialogo>

      <Dialogo
        abierto={dialogo === "todas"}
        onCerrar={() => setDialogo(null)}
        titulo="¿Cerrar todas las sesiones?"
        descripcion="Saldrás de este y de cualquier otro dispositivo donde hayas entrado. Tendrás que iniciar sesión otra vez."
      >
        <form
          action={cerrarTodasAccion}
          className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <button
            type="button"
            autoFocus
            onClick={() => setDialogo(null)}
            className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Cancelar
          </button>
          <Confirmar>Cerrar todas</Confirmar>
        </form>
      </Dialogo>
    </div>
  );
}

function Confirmar({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-control bg-marca px-4 font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-70"
    >
      {pending ? "Un momento…" : children}
    </button>
  );
}

const inicial: EstadoFormulario = {};

function FormCambiarContrasena({ correo, onListo }: { correo: string; onListo: () => void }) {
  const [estado, accion] = useActionState(cambiarContrasenaAccion, inicial);
  if (estado.mensaje?.tipo === "exito")
    return (
      <div className="mt-5">
        <p
          role="status"
          className="rounded-lg bg-turquesa/10 p-4 text-sm text-tinta ring-1 ring-turquesa/30 ring-inset"
        >
          {estado.mensaje.texto}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onListo}
          className="mt-5 min-h-11 w-full rounded-control border border-linea font-semibold text-tinta hover:border-tenue"
        >
          Listo
        </button>
      </div>
    );
  return (
    <form action={accion} noValidate className="mt-5 space-y-4">
      <ResumenErrores estado={estado} />
      <input type="email" name="usuario" autoComplete="username" value={correo} readOnly hidden />
      <CampoContrasena
        id="contrasenaActual"
        etiqueta="Contraseña actual"
        autoComplete="current-password"
        error={estado.errores?.contrasenaActual}
      />
      <CampoContrasena
        id="contrasena"
        etiqueta="Contraseña nueva"
        nueva
        autoComplete="new-password"
        error={estado.errores?.contrasena}
      />
      <CampoContrasena
        id="confirmarContrasena"
        etiqueta="Repite la contraseña nueva"
        autoComplete="new-password"
        error={estado.errores?.confirmarContrasena}
      />
      <BotonEnviar enviando="Guardando…">Cambiar contraseña</BotonEnviar>
    </form>
  );
}
