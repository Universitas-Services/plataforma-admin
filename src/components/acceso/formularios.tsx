"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  aceptarInvitacionAccion,
  ingresarAccion,
  recuperarAccion,
  reenviarInvitacionAccion,
  restablecerAccion,
  type EstadoFormulario,
} from "@/lib/plataforma/acciones";
import { correoSchema, nombreSchema } from "@/lib/validation/common";
import {
  AvisoDesarrollo,
  BotonEnviar,
  Campo,
  CampoContrasena,
  CampoDocumento,
  ResumenErrores,
  soloLetras,
} from "@/components/formularios/campos";

const inicial: EstadoFormulario = {};
const enlace = "text-sm font-semibold text-marca-texto hover:underline";

export function FormIngreso({ volver }: { volver?: string }) {
  const [estado, accion] = useActionState(ingresarAccion, inicial);
  return (
    <form action={accion} noValidate className="space-y-5">
      <ResumenErrores estado={estado} />
      {volver && <input type="hidden" name="volver" value={volver} />}
      <Campo
        id="correo"
        etiqueta="Correo institucional"
        type="email"
        autoComplete="username"
        required
        defaultValue={estado.valores?.correo}
        error={estado.errores?.correo}
      />
      <CampoContrasena
        id="contrasena"
        etiqueta="Contraseña"
        autoComplete="current-password"
        error={estado.errores?.contrasena}
      />
      <div className="flex justify-end">
        <Link href="/recuperar" className={enlace}>
          Olvidé mi contraseña
        </Link>
      </div>
      <BotonEnviar enviando="Entrando…">Iniciar sesión</BotonEnviar>
    </form>
  );
}

export function FormRecuperar() {
  const [estado, accion] = useActionState(recuperarAccion, inicial);
  return (
    <form action={accion} noValidate className="space-y-5">
      <ResumenErrores estado={estado} />
      <Campo
        id="correo"
        etiqueta="Correo de tu cuenta"
        type="email"
        autoComplete="email"
        required
        esquema={correoSchema}
        defaultValue={estado.valores?.correo}
        error={estado.errores?.correo}
      />
      <BotonEnviar enviando="Enviando…">Enviar el enlace</BotonEnviar>
      <AvisoDesarrollo enlace={estado.enlaceDesarrollo} />
    </form>
  );
}

function Contrasenas({ estado }: { estado: EstadoFormulario }) {
  return (
    <>
      <CampoContrasena
        id="contrasena"
        etiqueta="Contraseña nueva"
        nueva
        autoComplete="new-password"
        error={estado.errores?.contrasena}
      />
      <CampoContrasena
        id="confirmarContrasena"
        etiqueta="Repite la contraseña"
        autoComplete="new-password"
        error={estado.errores?.confirmarContrasena}
      />
    </>
  );
}

export function FormRestablecer({ token }: { token: string }) {
  const [estado, accion] = useActionState(restablecerAccion, inicial);
  return (
    <form action={accion} noValidate className="space-y-5">
      <ResumenErrores estado={estado} />
      <input type="hidden" name="token" value={token} />
      <Contrasenas estado={estado} />
      <BotonEnviar enviando="Guardando…">Guardar la contraseña</BotonEnviar>
    </form>
  );
}

export function FormInvitacion({ token, correo }: { token: string; correo: string }) {
  const [estado, accion] = useActionState(aceptarInvitacionAccion, inicial);
  const v = estado.valores ?? {};
  const nombre = {
    required: true,
    maxLength: 100,
    esquema: nombreSchema,
    filtrar: soloLetras,
    avisoFiltro: "Solo letras y espacios.",
  };
  return (
    <form action={accion} noValidate className="space-y-5">
      <ResumenErrores estado={estado} />
      <input type="hidden" name="token" value={token} />
      <input type="email" name="usuario" autoComplete="username" value={correo} readOnly hidden />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="nombres"
          etiqueta="Nombres"
          autoComplete="given-name"
          defaultValue={v.nombres}
          error={estado.errores?.nombres}
          {...nombre}
        />
        <Campo
          id="apellidos"
          etiqueta="Apellidos"
          autoComplete="family-name"
          defaultValue={v.apellidos}
          error={estado.errores?.apellidos}
          {...nombre}
        />
      </div>
      <CampoDocumento
        id="cedula"
        etiqueta="Cédula de identidad"
        prefijos={["V", "E"]}
        valorPrefijo={v.cedulaPrefijo}
        valorNumero={v.cedulaNumero}
        placeholder="12345678"
        ayuda="Solo números, sin puntos."
        error={estado.errores?.cedula}
      />
      <Contrasenas estado={estado} />
      <BotonEnviar enviando="Activando…">Activar mi cuenta</BotonEnviar>
    </form>
  );
}

export function FormReenviarInvitacion({ token }: { token: string }) {
  const [estado, accion] = useActionState(reenviarInvitacionAccion, inicial);
  return (
    <form action={accion} className="space-y-5">
      <ResumenErrores estado={estado} />
      <input type="hidden" name="token" value={token} />
      <BotonEnviar enviando="Enviando…">Pedir una invitación nueva</BotonEnviar>
      <AvisoDesarrollo enlace={estado.enlaceDesarrollo} />
    </form>
  );
}
