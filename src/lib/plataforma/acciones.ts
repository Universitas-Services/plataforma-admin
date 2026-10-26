"use server";

import { RedirectType, redirect } from "next/navigation";
import type { z } from "zod";
import {
  aceptarInvitacionSchema,
  cambiarContrasenaSchema,
  loginSchema,
  recuperarSchema,
  restablecerSchema,
} from "@/lib/validation/schemas";
import {
  aceptarInvitacion,
  cambiarContrasena,
  cerrarSesion,
  cerrarTodas,
  iniciarSesion,
  recuperar,
  reenviarInvitacion,
  restablecer,
} from "./servicio";
import {
  abrirSesion,
  almacen,
  borrarSesion,
  esDemo,
  guardarAviso,
  idSesion,
  refrescarSesion,
} from "./sesion";

/** Estado que devuelven las acciones a sus formularios (useActionState). */
export type EstadoFormulario = {
  errores?: Record<string, string>;
  /** Lo escrito, para no vaciar el formulario si hay errores (nunca las contraseñas). */
  valores?: Record<string, string>;
  mensaje?: { tipo: "error" | "info" | "exito"; texto: string };
  /** Solo en desarrollo: enlace que en producción llegaría por correo. */
  enlaceDesarrollo?: string;
};

const SECRETOS = ["contrasena", "contrasenaActual", "confirmarContrasena"];

function leer(fd: FormData) {
  const datos: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") datos[k] = v;
  if (fd.has("cedulaNumero")) datos.cedula = `${fd.get("cedulaPrefijo")}-${fd.get("cedulaNumero")}`;
  return datos;
}

function valoresDe(datos: Record<string, unknown>) {
  const valores: Record<string, string> = {};
  for (const [k, v] of Object.entries(datos))
    if (typeof v === "string" && !SECRETOS.includes(k)) valores[k] = v;
  return valores;
}

function conErrores(error: z.ZodError, datos: Record<string, unknown>): EstadoFormulario {
  const errores: Record<string, string> = {};
  for (const i of error.issues) errores[String(i.path[0] ?? "formulario")] ??= i.message;
  return { errores, valores: valoresDe(datos) };
}

/** Solo rutas internas para «volver», para no abrir una redirección a otro sitio. */
const destinoSeguro = (volver: unknown, porDefecto: string) =>
  typeof volver === "string" && volver.startsWith("/") && !volver.startsWith("//")
    ? volver
    : porDefecto;

/**
 * Redirección que reemplaza la entrada del historial. En una Server Action, `redirect()` usa
 * push por defecto: tras iniciar sesión, «atrás» volvería al formulario.
 */
function ir(ruta: string): never {
  return redirect(ruta, RedirectType.replace);
}

/* ---------- Sesión ---------- */

export async function ingresarAccion(
  _p: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const datos = leer(fd);
  const p = loginSchema.safeParse(datos);
  if (!p.success) return conErrores(p.error, datos);
  const r = iniciarSesion(almacen(), p.data.correo, p.data.contrasena);
  const valores = { correo: p.data.correo };
  if (r.estado === "CREDENCIALES")
    return {
      valores,
      mensaje: { tipo: "error", texto: "El correo o la contraseña no son correctos." },
    };
  if (r.estado === "BLOQUEADA")
    return {
      valores,
      mensaje: {
        tipo: "error",
        texto: `Por seguridad, la cuenta quedó bloqueada. Intenta de nuevo en ${r.minutos} ${r.minutos === 1 ? "minuto" : "minutos"} o restablece la contraseña.`,
      },
    };
  if (r.estado === "DESACTIVADA")
    return {
      valores,
      mensaje: {
        tipo: "error",
        texto: "Tu cuenta está desactivada. Pide al administrador de tu alcaldía que la reactive.",
      },
    };
  await abrirSesion(r.sesion);
  ir(destinoSeguro(fd.get("volver"), r.destino));
}

export async function cerrarSesionAccion() {
  cerrarSesion(almacen(), await idSesion());
  await borrarSesion();
  ir("/ingresar");
}

export async function cerrarTodasAccion() {
  cerrarTodas(almacen(), await idSesion());
  await borrarSesion();
  await guardarAviso("Cerramos tu sesión en todos los dispositivos.");
  ir("/ingresar");
}

export async function cambiarContrasenaAccion(
  _p: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const datos = leer(fd);
  const p = cambiarContrasenaSchema.safeParse(datos);
  if (!p.success) return conErrores(p.error, datos);
  const sesion = await idSesion();
  const r = cambiarContrasena(almacen(), sesion, p.data.contrasenaActual, p.data.contrasena);
  if (r === "SIN_SESION") ir("/ingresar");
  if (r === "ACTUAL_INCORRECTA")
    return { errores: { contrasenaActual: "La contraseña actual no es correcta." } };
  if (r === "IGUAL_A_LA_ACTUAL")
    return { errores: { contrasena: "La contraseña nueva debe ser distinta de la actual." } };
  // Los tokens anteriores quedaron revocados: la sesión actual se firma de nuevo.
  await refrescarSesion(sesion);
  return {
    mensaje: {
      tipo: "exito",
      texto: "Contraseña actualizada. Cerramos tu sesión en los demás dispositivos.",
    },
  };
}

/* ---------- Recuperar, restablecer e invitación ---------- */

const enlace = (ruta: string, token?: string) =>
  esDemo && token ? `${ruta}?token=${token}` : undefined;

export async function recuperarAccion(
  _p: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const datos = leer(fd);
  const p = recuperarSchema.safeParse(datos);
  if (!p.success) return conErrores(p.error, datos);
  const { tokenDesarrollo } = recuperar(almacen(), p.data.correo);
  return {
    valores: { correo: p.data.correo },
    mensaje: {
      tipo: "exito",
      texto:
        "Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Vence en 1 hora.",
    },
    enlaceDesarrollo: enlace("/restablecer", tokenDesarrollo),
  };
}

export async function restablecerAccion(
  _p: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const datos = leer(fd);
  const p = restablecerSchema.safeParse(datos);
  if (!p.success) return conErrores(p.error, datos);
  const estado = restablecer(almacen(), p.data.token, p.data.contrasena);
  if (estado === "OK") {
    await guardarAviso("Listo: ya puedes entrar con tu contraseña nueva.");
    ir("/ingresar");
  }
  const texto =
    estado === "VENCIDO"
      ? "El enlace venció. Pide uno nuevo desde «Olvidé mi contraseña»."
      : estado === "USADO"
        ? "Este enlace ya se usó. Si necesitas cambiar la contraseña otra vez, pide uno nuevo."
        : "El enlace no es válido.";
  return { mensaje: { tipo: "error", texto } };
}

export async function aceptarInvitacionAccion(
  _p: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const datos = leer(fd);
  const p = aceptarInvitacionSchema.safeParse(datos);
  if (!p.success) return conErrores(p.error, datos);
  const r = aceptarInvitacion(almacen(), String(fd.get("token") ?? ""), p.data);
  if (r === "CEDULA_EN_USO")
    return {
      errores: { cedula: "Esta cédula ya pertenece a otra cuenta del panel." },
      valores: valoresDe(datos),
    };
  if (r !== "OK")
    return {
      mensaje: { tipo: "error", texto: "La invitación ya no es válida. Pide que te la reenvíen." },
    };
  await guardarAviso(
    "Tu cuenta está lista. Inicia sesión con tu correo y la contraseña que creaste.",
  );
  ir("/ingresar");
}

export async function reenviarInvitacionAccion(
  _p: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  const nuevo = reenviarInvitacion(almacen(), String(fd.get("token") ?? ""));
  return {
    mensaje: {
      tipo: "info",
      texto:
        "Si la invitación sigue pendiente, enviamos un enlace nuevo a tu correo. Vence en 72 horas.",
    },
    enlaceDesarrollo: enlace("/invitacion", nuevo),
  };
}
