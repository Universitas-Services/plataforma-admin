"use server";

import { refresh, revalidatePath } from "next/cache";
import {
  cambiarActivoItem,
  cambiarActivoMiembro,
  cambiarMembresia,
  editarRoles,
  eliminarFase,
  fijarFaseActual,
  guardarFase,
  guardarItem,
  invitarMiembro,
  MOTIVO_MIN,
  moverFase,
  moverItem,
  reenviarInvitacionMiembro,
} from "./alcaldia";
import { verificarIntegridad } from "./servicio";
import { almacen, esDemo, getContexto, idSesion } from "./sesion";
import {
  ESTADOS_SIGUIENTE,
  TIPOS_CATALOGO,
  type EstadoSiguiente,
  type TipoCatalogo,
} from "./tipos";
import { usaApi } from "@/lib/api/cliente";
import { activarItemApi, guardarItemApi, moverItemApi } from "@/lib/api/catalogos";
import { eliminarFaseApi, faseActualApi, guardarFaseApi, moverFaseApi } from "@/lib/api/proceso";

/*
 * Acciones del Admin de alcaldía (backlog 2.8, 2.11, 2.12 y 2.13). Devuelven el resultado a la
 * pantalla, que muestra el aviso; las páginas afectadas se purgan para no mostrar datos viejos.
 */

export type Respuesta = {
  ok: boolean;
  mensaje: string;
  errores?: Record<string, string>;
  /** Solo en desarrollo o demostración: el enlace que en producción llegaría por correo. */
  enlace?: string;
};

const COMUNES: Record<string, Respuesta> = {
  SIN_SESION: { ok: false, mensaje: "Tu sesión terminó. Vuelve a iniciar sesión." },
  SIN_PERMISO: { ok: false, mensaje: "Tu rol no puede hacer este cambio en esta alcaldía." },
  NO_EXISTE: { ok: false, mensaje: "El registro ya no existe. Recarga la página." },
};

function purgar(ruta: string) {
  revalidatePath(ruta, "layout");
  revalidatePath("/bitacora");
  refresh();
}

const enlaceInvitacion = (token?: string) =>
  esDemo && token ? `/invitacion?token=${token}` : undefined;

/* ---------- Equipo ---------- */

export async function invitarMiembroAccion(correo: string, roles: string[]): Promise<Respuesta> {
  const limpio = correo.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio))
    return {
      ok: false,
      mensaje: "Revisa el correo.",
      errores: { correo: "Escribe un correo válido." },
    };
  const r = invitarMiembro(almacen(), await idSesion(), limpio, roles);
  switch (r.estado) {
    case "OK":
      purgar("/equipo");
      return {
        ok: true,
        mensaje: r.token
          ? `Invitación enviada a ${limpio.toLowerCase()}. Vence en 72 horas.`
          : `${limpio.toLowerCase()} ya tenía cuenta: lo agregamos al equipo.`,
        enlace: enlaceInvitacion(r.token),
      };
    case "SIN_ROLES":
      return {
        ok: false,
        mensaje: "Elige al menos un rol.",
        errores: { roles: "Marca Operador, Revisor o ambos." },
      };
    case "YA_ES_MIEMBRO":
      return {
        ok: false,
        mensaje: "Esa persona ya es parte del equipo.",
        errores: { correo: "Ya es parte del equipo de esta alcaldía." },
      };
    default:
      return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  }
}

const NO_EDITABLE: Record<string, Respuesta> = {
  A_TI_MISMO: { ok: false, mensaje: "No puedes cambiar tus propios roles ni desactivarte." },
  ES_ADMIN: { ok: false, mensaje: "Los administradores se gestionan desde la plataforma." },
  SIN_ROLES: { ok: false, mensaje: "Elige al menos un rol." },
};

export async function editarRolesAccion(usuarioId: string, roles: string[]): Promise<Respuesta> {
  const r = editarRoles(almacen(), await idSesion(), usuarioId, roles);
  if (r.estado !== "OK") return NO_EDITABLE[r.estado] ?? COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/equipo");
  return { ok: true, mensaje: "Roles actualizados." };
}

export async function activarMiembroAccion(usuarioId: string, activo: boolean): Promise<Respuesta> {
  const r = cambiarActivoMiembro(almacen(), await idSesion(), usuarioId, activo);
  if (r.estado !== "OK") return NO_EDITABLE[r.estado] ?? COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/equipo");
  return {
    ok: true,
    mensaje: activo ? "Miembro activado." : "Miembro desactivado: ya no entra a esta alcaldía.",
  };
}

export async function reenviarInvitacionAccion(usuarioId: string): Promise<Respuesta> {
  const r = reenviarInvitacionMiembro(almacen(), await idSesion(), usuarioId);
  if (r.estado !== "OK") return NO_EDITABLE[r.estado] ?? COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/equipo");
  return {
    ok: true,
    mensaje: "Invitación reenviada. El enlace anterior dejó de valer.",
    enlace: enlaceInvitacion(r.token),
  };
}

/* ---------- Ciudadanos ---------- */

export async function membresiaAccion(
  id: string,
  estado: "ACTIVA" | "SUSPENDIDA",
  motivo: string,
): Promise<Respuesta> {
  const r = cambiarMembresia(almacen(), await idSesion(), id, estado, motivo);
  if (r.estado === "SIN_MOTIVO")
    return {
      ok: false,
      mensaje: "Explica el motivo.",
      errores: { motivo: `Escribe al menos ${MOTIVO_MIN} caracteres.` },
    };
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/ciudadanos");
  return {
    ok: true,
    mensaje:
      estado === "SUSPENDIDA"
        ? "Cuenta suspendida: no podrá iniciar sesión ni participar."
        : "Cuenta reactivada.",
  };
}

/* ---------- Catálogos: los desplegables del portal (R16) ---------- */

const esTipoCatalogo = (t: unknown): t is TipoCatalogo =>
  typeof t === "string" && t in TIPOS_CATALOGO;

/** Crea (sin id) o renombra un valor de un catálogo. */
export async function guardarItemAccion(
  tipo: TipoCatalogo,
  nombre: string,
  id?: string,
): Promise<Respuesta> {
  if (!esTipoCatalogo(tipo)) return COMUNES.NO_EXISTE!;
  const limpio = String(nombre ?? "");
  const r = usaApi()
    ? await guardarItemApi(tipo, limpio.trim(), id)
    : guardarItem(almacen(), await idSesion(), tipo, limpio, id);
  if (r.estado === "VACIO")
    return { ok: false, mensaje: "Escribe el nombre.", errores: { nombre: "Escribe el nombre." } };
  if (r.estado === "REPETIDO")
    return {
      ok: false,
      mensaje: "Ese valor ya existe.",
      errores: { nombre: "Ya existe un valor con ese nombre." },
    };
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/configuracion");
  return {
    ok: true,
    mensaje: id
      ? "Valor renombrado. Lo ya guardado con el nombre anterior se ve con el nuevo."
      : "Valor agregado: el portal ya lo ofrece.",
  };
}

export async function activarItemAccion(
  tipo: TipoCatalogo,
  id: string,
  activo: boolean,
): Promise<Respuesta> {
  if (!esTipoCatalogo(tipo)) return COMUNES.NO_EXISTE!;
  const r = usaApi()
    ? await activarItemApi(tipo, String(id), Boolean(activo))
    : cambiarActivoItem(almacen(), await idSesion(), tipo, String(id), Boolean(activo));
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/configuracion");
  return {
    ok: true,
    mensaje: activo
      ? "Valor activado: el portal vuelve a ofrecerlo."
      : "Valor desactivado: el portal deja de ofrecerlo; lo ya guardado lo conserva.",
  };
}

export async function moverItemAccion(
  tipo: TipoCatalogo,
  id: string,
  direccion: -1 | 1,
): Promise<Respuesta> {
  if (!esTipoCatalogo(tipo) || (direccion !== -1 && direccion !== 1)) return COMUNES.NO_EXISTE!;
  const r = usaApi()
    ? await moverItemApi(tipo, String(id), direccion)
    : moverItem(almacen(), await idSesion(), tipo, String(id), direccion);
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/configuracion");
  return { ok: true, mensaje: "Orden guardado." };
}

/* ---------- Proceso ---------- */

export async function guardarFaseAccion(datos: {
  id?: string;
  nombre: string;
  descripcion: string;
  inicio?: string;
  fin?: string;
  estadoSiguiente?: EstadoSiguiente;
}): Promise<Respuesta> {
  const limpio = {
    ...datos,
    nombre: String(datos.nombre ?? ""),
    descripcion: String(datos.descripcion ?? ""),
    estadoSiguiente: ESTADOS_SIGUIENTE.find((s) => s === datos.estadoSiguiente),
  };
  const r = usaApi()
    ? await guardarFaseApi(limpio)
    : guardarFase(almacen(), await idSesion(), limpio);
  if (r.estado === "VACIO")
    return { ok: false, mensaje: "Escribe el nombre.", errores: { nombre: "Escribe el nombre." } };
  if (r.estado === "FECHAS")
    return {
      ok: false,
      mensaje: "Revisa las fechas.",
      errores: { fin: "La fecha de cierre debe ser igual o posterior a la de inicio." },
    };
  if (r.estado === "LIMITE") return { ok: false, mensaje: "El proceso admite hasta 12 fases." };
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/contenido/proceso");
  return { ok: true, mensaje: datos.id ? "Fase actualizada." : "Fase agregada." };
}

export async function moverFaseAccion(id: string, direccion: -1 | 1): Promise<Respuesta> {
  const r = usaApi()
    ? await moverFaseApi(String(id), direccion)
    : moverFase(almacen(), await idSesion(), String(id), direccion);
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/contenido/proceso");
  return { ok: true, mensaje: "Orden de las fases guardado." };
}

export async function faseActualAccion(id: string): Promise<Respuesta> {
  const r = usaApi()
    ? await faseActualApi(String(id))
    : fijarFaseActual(almacen(), await idSesion(), String(id));
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/contenido/proceso");
  return { ok: true, mensaje: "Fase actual actualizada: el termómetro del portal la mostrará." };
}

export async function eliminarFaseAccion(id: string): Promise<Respuesta> {
  const r = usaApi()
    ? await eliminarFaseApi(String(id))
    : eliminarFase(almacen(), await idSesion(), String(id));
  if (r.estado === "FASE_ACTUAL")
    return {
      ok: false,
      mensaje: "La fase actual no se puede eliminar: marca otra como actual antes.",
    };
  if (r.estado !== "OK") return COMUNES[r.estado] ?? COMUNES.SIN_PERMISO!;
  purgar("/contenido/proceso");
  return { ok: true, mensaje: "Fase eliminada." };
}

/* ---------- Bitácora ---------- */

export async function verificarIntegridadAccion(): Promise<Respuesta> {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("bitacora.ver")) return COMUNES.SIN_PERMISO!;
  const r = verificarIntegridad(almacen());
  return r.ok
    ? { ok: true, mensaje: "Cadena íntegra: ningún evento fue alterado." }
    : { ok: false, mensaje: `La cadena se rompe en el evento ${r.eventoId}: revisa la bitácora.` };
}
