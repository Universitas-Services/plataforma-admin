"use server";

import { refresh } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { noticiaSchema } from "@/lib/validation/schemas";
import { cambiarEstadoNoticia, crearNoticia, guardarNoticia, type CambioEstado } from "./contenido";
import { almacen, guardarAviso, idSesion } from "./sesion";

/*
 * Acciones del editor de noticias (backlog 2.9). Guardar y cambiar de estado devuelven el
 * resultado al editor (que muestra el aviso y se queda en la página); crear y eliminar
 * redirigen con replace para que «atrás» no vuelva a una noticia recién creada o borrada.
 */

function ir(ruta: string): never {
  return redirect(ruta, RedirectType.replace);
}

export type RespuestaEditor =
  | { ok: true; actualizadoEl: string; estado: string; slug: string; mensaje?: string }
  | { ok: false; errores?: Record<string, string>; mensaje: string };

const SIN_SESION: RespuestaEditor = {
  ok: false,
  mensaje: "Tu sesión terminó. Vuelve a iniciar sesión para no perder los cambios.",
};
const SIN_PERMISO: RespuestaEditor = {
  ok: false,
  mensaje: "Tu rol no puede editar contenido en esta alcaldía.",
};
const NO_EXISTE: RespuestaEditor = { ok: false, mensaje: "Esta noticia ya no existe." };

export async function crearNoticiaAccion() {
  const r = crearNoticia(almacen(), await idSesion());
  if (r.estado !== "OK")
    return ir(
      r.estado === "SIN_SESION" ? "/ingresar?volver=/contenido/noticias" : "/contenido/noticias",
    );
  return ir(`/contenido/noticias/${r.id}`);
}

/** Guarda el formulario completo (autoguardado o «Guardar cambios»). */
export async function guardarNoticiaAccion(id: string, datos: unknown): Promise<RespuestaEditor> {
  const p = noticiaSchema.safeParse(datos);
  if (!p.success) {
    const errores: Record<string, string> = {};
    for (const i of p.error.issues) errores[String(i.path[0] ?? "formulario")] ??= i.message;
    return { ok: false, errores, mensaje: "Revisa los campos marcados." };
  }
  const r = guardarNoticia(almacen(), await idSesion(), id, p.data);
  switch (r.estado) {
    case "OK":
      return {
        ok: true,
        actualizadoEl: r.noticia.actualizadoEl,
        estado: r.noticia.estado,
        slug: r.noticia.slug,
      };
    case "INCOMPLETA":
      return {
        ok: false,
        errores: r.errores,
        mensaje: "La noticia ya está publicada o programada: completa lo que falta para guardar.",
      };
    case "MEDIO_AJENO":
      return { ok: false, mensaje: "Uno de los archivos no pertenece a esta alcaldía." };
    case "NO_EXISTE":
      return NO_EXISTE;
    case "SIN_PERMISO":
      return SIN_PERMISO;
    default:
      return SIN_SESION;
  }
}

const HECHO: Record<CambioEstado, string> = {
  publicar: "Noticia publicada en el portal.",
  programar: "Noticia programada.",
  aBorrador: "La noticia volvió a borrador: ya no se publicará sola.",
  despublicar: "Noticia despublicada: ya no se ve en el portal.",
  eliminar: "Borrador eliminado.",
};

/** Publicar, programar, volver a borrador, despublicar o eliminar (con la noticia ya guardada). */
export async function cambiarEstadoAccion(
  id: string,
  cambio: CambioEstado,
  publicarEl?: string,
): Promise<RespuestaEditor> {
  const r = cambiarEstadoNoticia(almacen(), await idSesion(), id, cambio, { publicarEl });
  switch (r.estado) {
    case "OK":
      if (cambio === "eliminar") {
        await guardarAviso(HECHO.eliminar);
        ir("/contenido/noticias");
      }
      refresh();
      return {
        ok: true,
        actualizadoEl: r.noticia.actualizadoEl,
        estado: r.noticia.estado,
        slug: r.noticia.slug,
        mensaje: HECHO[cambio],
      };
    case "INCOMPLETA":
      return {
        ok: false,
        errores: r.errores,
        mensaje: "Antes de publicar o programar, completa lo que falta.",
      };
    case "FECHA_PASADA":
      return {
        ok: false,
        errores: { publicarEl: "Elige una fecha y hora futuras." },
        mensaje: "Elige una fecha y hora futuras.",
      };
    case "TRANSICION":
      return {
        ok: false,
        mensaje: "La noticia cambió de estado mientras la editabas. Recarga la página.",
      };
    case "NO_EXISTE":
      return NO_EXISTE;
    case "SIN_PERMISO":
      return SIN_PERMISO;
    default:
      return SIN_SESION;
  }
}
