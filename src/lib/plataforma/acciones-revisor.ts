"use server";

import { refresh, revalidatePath } from "next/cache";
import {
  agregarNota,
  cambiarEstado,
  TEXTO_RECHAZO_MIN,
  type ResultadoRevisor,
} from "./participaciones";
import { almacen, idSesion } from "./sesion";
import type { EstadoParticipacion } from "./tipos";

/*
 * Acciones del Revisor (backlog 2.10). Devuelven el resultado al detalle, que muestra el aviso y
 * se queda en la página; las listas (bandeja, tablero, contador del menú) se purgan.
 */

export type RespuestaRevisor = {
  ok: boolean;
  mensaje: string;
  errores?: Record<string, string>;
};

function invalidar() {
  revalidatePath("/participaciones", "layout");
  revalidatePath("/tablero");
  refresh();
}

const ERRORES: Record<Exclude<ResultadoRevisor, "OK">, RespuestaRevisor> = {
  SIN_SESION: { ok: false, mensaje: "Tu sesión terminó. Vuelve a iniciar sesión." },
  SIN_PERMISO: { ok: false, mensaje: "Tu rol no puede evaluar aportes en esta alcaldía." },
  NO_EXISTE: { ok: false, mensaje: "Este aporte ya no existe." },
  TRANSICION_INVALIDA: {
    ok: false,
    mensaje: "Ese cambio de estado no es válido desde el estado actual. Recarga la página.",
  },
  SIN_MOTIVO: {
    ok: false,
    mensaje: "Elige el motivo del rechazo.",
    errores: { motivo: "Elige un motivo de la lista." },
  },
  TEXTO_CORTO: {
    ok: false,
    mensaje: "Explica el rechazo al ciudadano.",
    errores: { texto: `Escribe al menos ${TEXTO_RECHAZO_MIN} caracteres.` },
  },
  NOTA_VACIA: {
    ok: false,
    mensaje: "Escribe la nota.",
    errores: { nota: "La nota no puede estar vacía." },
  },
};

const HECHO: Record<EstadoParticipacion, string> = {
  PENDIENTE: "Aporte devuelto a pendiente.",
  EN_REVISION: "Aporte en revisión.",
  APROBADA: "Aporte verificado.",
  RECHAZADA: "Aporte rechazado. El ciudadano recibirá el motivo.",
  PUBLICADA: "Aporte publicado en el portal.",
};

export async function cambiarEstadoAccion(
  folio: string,
  destino: EstadoParticipacion,
  datos: { motivo?: string; texto?: string; comentario?: string } = {},
  publicado = false,
): Promise<RespuestaRevisor> {
  const r = cambiarEstado(almacen(), await idSesion(), folio, destino, datos);
  if (r !== "OK") return ERRORES[r];
  invalidar();
  return {
    ok: true,
    mensaje:
      publicado && (destino === "APROBADA" || destino === "PENDIENTE")
        ? "Aporte despublicado: ya no se ve en el portal."
        : HECHO[destino],
  };
}

export async function agregarNotaAccion(folio: string, texto: string): Promise<RespuestaRevisor> {
  const r = agregarNota(almacen(), await idSesion(), folio, texto);
  if (r !== "OK") return ERRORES[r];
  invalidar();
  return { ok: true, mensaje: "Nota interna agregada." };
}
