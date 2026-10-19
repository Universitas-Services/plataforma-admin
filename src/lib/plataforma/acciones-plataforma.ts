"use server";

import { refresh, revalidatePath } from "next/cache";
import { cambiarEstadoAlcaldia, crearAlcaldia, MOTIVO_SUSPENSION_MIN } from "./plataforma";
import { almacen, esDemo, idSesion } from "./sesion";

/* Acciones de la capa de plataforma (backlog 2.7): alta de alcaldías y su estado. */

export type RespuestaPlataforma = {
  ok: boolean;
  mensaje: string;
  errores?: Record<string, string>;
  /** Solo en desarrollo o demostración: la invitación que en producción llegaría por correo. */
  enlace?: string;
  id?: string;
};

const COMUNES: Record<string, RespuestaPlataforma> = {
  SIN_SESION: { ok: false, mensaje: "Tu sesión terminó. Vuelve a iniciar sesión." },
  SIN_PERMISO: { ok: false, mensaje: "Tu rol no puede gestionar alcaldías." },
  NO_EXISTE: { ok: false, mensaje: "La alcaldía ya no existe. Recarga la página." },
};

function purgar() {
  revalidatePath("/plataforma", "layout");
  revalidatePath("/alcaldia");
  refresh();
}

export async function crearAlcaldiaAccion(datos: {
  nombre: string;
  sigla: string;
  correoAdmin: string;
}): Promise<RespuestaPlataforma> {
  const r = crearAlcaldia(almacen(), await idSesion(), datos);
  if (r.estado === "INVALIDO")
    return { ok: false, mensaje: "Revisa los campos marcados.", errores: r.errores };
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar();
  return {
    ok: true,
    id: r.id,
    mensaje: r.token
      ? "Alcaldía creada. Su administrador recibió la invitación (vence en 72 horas)."
      : "Alcaldía creada. El administrador ya tenía cuenta: se le agregó el rol.",
    enlace: esDemo && r.token ? `/invitacion?token=${r.token}` : undefined,
  };
}

export async function estadoAlcaldiaAccion(
  id: string,
  suspender: boolean,
  motivo: string,
): Promise<RespuestaPlataforma> {
  const r = cambiarEstadoAlcaldia(almacen(), await idSesion(), id, suspender, motivo);
  if (r.estado === "SIN_MOTIVO")
    return {
      ok: false,
      mensaje: "Explica el motivo.",
      errores: { motivo: `Escribe al menos ${MOTIVO_SUSPENSION_MIN} caracteres.` },
    };
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar();
  return {
    ok: true,
    mensaje: suspender
      ? "Alcaldía suspendida: su equipo ya no puede entrar."
      : "Alcaldía reactivada.",
  };
}
