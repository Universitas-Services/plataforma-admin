"use server";

import { refresh, revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import {
  adjuntoSchema,
  bannerSchema,
  documentoSchema,
  noticiaSchema,
  versionSchema,
} from "@/lib/validation/schemas";
import { eliminarBanner, guardarBanner, ordenarBanners } from "./banners";
import { crearDocumento, eliminarDocumento, guardarDocumento, nuevaVersion } from "./documentos";
import { cambiarEstadoNoticia, crearNoticia, guardarNoticia, type CambioEstado } from "./contenido";
import { almacen, guardarAviso, idSesion } from "./sesion";

/*
 * Acciones del editor de noticias (backlog 2.9). Guardar y cambiar de estado devuelven el
 * resultado al editor (que muestra el aviso y se queda en la página); crear y eliminar
 * redirigen con replace para que «atrás» no vuelva a una noticia recién creada o borrada.
 */

/**
 * Tras un cambio, las listas de Contenido que el navegador ya tenía (visitadas o precargadas)
 * quedan viejas: se purgan para que la próxima visita las pida de nuevo.
 */
function invalidar() {
  revalidatePath("/contenido", "layout");
}

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
        invalidar();
        refresh();
        ir("/contenido/noticias");
      }
      invalidar();
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

/* ---------- Banners y documentos ---------- */

export type Respuesta = { ok: boolean; errores?: Record<string, string>; mensaje: string };

function erroresDe(issues: { path: PropertyKey[]; message: string }[]) {
  const errores: Record<string, string> = {};
  for (const i of issues) {
    // enlace.href → «enlace-href», el id del campo en el formulario.
    const clave = i.path.length ? i.path.map(String).join("-") : "formulario";
    errores[clave] ??= i.message;
  }
  return { ok: false, errores, mensaje: "Revisa los campos marcados." };
}

const COMUNES = {
  SIN_SESION: { ok: false, mensaje: SIN_SESION.mensaje },
  SIN_PERMISO: { ok: false, mensaje: SIN_PERMISO.mensaje },
  NO_EXISTE: {
    ok: false,
    mensaje: "Ya no existe: puede que alguien del equipo lo haya eliminado.",
  },
  MEDIO_AJENO: { ok: false, mensaje: "El archivo no pertenece a esta alcaldía." },
} satisfies Record<string, Respuesta>;

/** Crea (id vacío) o actualiza un banner y vuelve a la lista. */
export async function guardarBannerAccion(id: string | null, datos: unknown): Promise<Respuesta> {
  const p = bannerSchema.safeParse(datos);
  if (!p.success) return erroresDe(p.error.issues);
  const r = guardarBanner(almacen(), await idSesion(), id ?? undefined, p.data);
  if (r.estado === "FECHAS")
    return {
      ok: false,
      errores: { vigencia: "La fecha final tiene que ser igual o posterior a la inicial." },
      mensaje: "Revisa las fechas.",
    };
  if (r.estado !== "OK") return COMUNES[r.estado];
  await guardarAviso(id ? "Banner actualizado." : "Banner creado al final del carrusel.");
  invalidar();
  refresh();
  return ir("/contenido/banners");
}

export async function eliminarBannerAccion(id: string): Promise<Respuesta> {
  const r = eliminarBanner(almacen(), await idSesion(), id);
  if (r.estado !== "OK") return COMUNES[r.estado];
  await guardarAviso("Banner eliminado.");
  invalidar();
  refresh();
  return ir("/contenido/banners");
}

export async function ordenarBannersAccion(ids: string[]): Promise<Respuesta> {
  const r = ordenarBanners(almacen(), await idSesion(), ids);
  if (r.estado === "LISTA_INVALIDA")
    return {
      ok: false,
      mensaje: "Alguien del equipo cambió los banners mientras ordenabas. Recarga la página.",
    };
  if (r.estado !== "OK") return COMUNES[r.estado];
  // Sin refresh: la lista ya muestra el orden nuevo y recargarla borraría el aviso.
  return { ok: true, mensaje: "Orden guardado: así se verán en el carrusel." };
}

export async function crearDocumentoAccion(datos: unknown, archivo: unknown): Promise<Respuesta> {
  const p = documentoSchema.safeParse(datos);
  if (!p.success) return erroresDe(p.error.issues);
  const a = adjuntoSchema.safeParse(archivo);
  if (!a.success)
    return { ok: false, errores: { archivo: "Sube el PDF." }, mensaje: "Falta el archivo." };
  const r = crearDocumento(almacen(), await idSesion(), p.data, a.data);
  if (r.estado !== "OK") return COMUNES[r.estado];
  await guardarAviso("Documento subido: versión 1.0.");
  invalidar();
  refresh();
  return ir(`/contenido/documentos/${r.documento.id}`);
}

export async function guardarDocumentoAccion(id: string, datos: unknown): Promise<Respuesta> {
  const p = documentoSchema.safeParse(datos);
  if (!p.success) return erroresDe(p.error.issues);
  const r = guardarDocumento(almacen(), await idSesion(), id, p.data);
  if (r.estado !== "OK") return COMUNES[r.estado];
  invalidar();
  refresh();
  return { ok: true, mensaje: "Datos del documento guardados." };
}

export async function nuevaVersionAccion(
  id: string,
  archivo: unknown,
  datos: unknown,
): Promise<Respuesta> {
  const v = versionSchema.safeParse(datos);
  if (!v.success) return erroresDe(v.error.issues);
  const a = adjuntoSchema.safeParse(archivo);
  if (!a.success)
    return {
      ok: false,
      errores: { archivo: "Sube el PDF de la nueva versión." },
      mensaje: "Falta el archivo.",
    };
  const r = nuevaVersion(almacen(), await idSesion(), id, a.data, v.data.nota, v.data.tipo);
  if (r.estado !== "OK") return COMUNES[r.estado];
  invalidar();
  refresh();
  return { ok: true, mensaje: `Versión ${r.documento.version} publicada como vigente.` };
}

export async function eliminarDocumentoAccion(id: string): Promise<Respuesta> {
  const r = eliminarDocumento(almacen(), await idSesion(), id);
  if (r.estado !== "OK") return COMUNES[r.estado];
  await guardarAviso("Documento eliminado del repositorio.");
  invalidar();
  refresh();
  return ir("/contenido/documentos");
}
