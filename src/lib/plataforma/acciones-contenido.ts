"use server";

import { refresh, revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import {
  adjuntoSchema,
  bannerSchema,
  documentoSchema,
  itemMarcoSchema,
  noticiaSchema,
  versionSchema,
} from "@/lib/validation/schemas";
import { usaApi } from "@/lib/api/cliente";
import {
  crearDocumentoApi,
  eliminarDocumentoApi,
  guardarDocumentoApi,
  nuevaVersionApi,
} from "@/lib/api/documentos";
import { cambiarEstadoApi, crearNoticiaApi, guardarNoticiaApi } from "@/lib/api/noticias";
import { eliminarBanner, guardarBanner, ordenarBanners } from "./banners";
import { crearDocumento, eliminarDocumento, guardarDocumento, nuevaVersion } from "./documentos";
import { cambiarEstadoNoticia, crearNoticia, guardarNoticia, type CambioEstado } from "./contenido";
import { guardarInicio } from "./inicio";
import {
  MAX_ACTIVOS,
  crearItemMarco,
  eliminarItemMarco,
  guardarItemMarco,
  ordenarMarco,
} from "./marco-legal";
import { almacen, guardarAviso, idSesion, contenidoAlDia } from "./sesion";

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
  const r = usaApi() ? await crearNoticiaApi() : crearNoticia(almacen(), await idSesion());
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
  const r = usaApi()
    ? await guardarNoticiaApi(id, p.data)
    : guardarNoticia(almacen(), await idSesion(), id, p.data);
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
  const r = usaApi()
    ? await cambiarEstadoApi(id, cambio, publicarEl)
    : cambiarEstadoNoticia(almacen(), await idSesion(), id, cambio, { publicarEl });
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
    case "FECHA_PASADA": {
      // La API manda su texto en details.campos.publicarEl; el almacén, ninguno.
      const deApi = "errores" in r ? (r.errores as Record<string, string>).publicarEl : undefined;
      const texto = deApi || "Elige una fecha y hora futuras.";
      return { ok: false, errores: { publicarEl: texto }, mensaje: texto };
    }
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

/* ---------- Documentos ---------- */

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

/** Resultado de un documento (simulado o de la API) → la respuesta del formulario. */
function fallaDocumento(
  r: { estado: keyof typeof COMUNES } | { estado: "INVALIDO"; errores: Record<string, string> },
): Respuesta {
  if (r.estado !== "INVALIDO") return COMUNES[r.estado];
  return { ok: false, errores: r.errores, mensaje: "Revisa los campos marcados." };
}

export async function crearDocumentoAccion(datos: unknown, archivo: unknown): Promise<Respuesta> {
  const p = documentoSchema.safeParse(datos);
  if (!p.success) return erroresDe(p.error.issues);
  const a = adjuntoSchema.safeParse(archivo);
  if (!a.success)
    return { ok: false, errores: { archivo: "Sube el PDF." }, mensaje: "Falta el archivo." };
  const r = usaApi()
    ? await crearDocumentoApi(p.data, a.data)
    : crearDocumento(almacen(), await idSesion(), p.data, a.data);
  if (r.estado !== "OK") return fallaDocumento(r);
  await guardarAviso("Documento subido: versión 1.0.");
  invalidar();
  refresh();
  return ir(`/contenido/documentos/${r.documento.id}`);
}

export async function guardarDocumentoAccion(id: string, datos: unknown): Promise<Respuesta> {
  const p = documentoSchema.safeParse(datos);
  if (!p.success) return erroresDe(p.error.issues);
  const r = usaApi()
    ? await guardarDocumentoApi(id, p.data)
    : guardarDocumento(almacen(), await idSesion(), id, p.data);
  if (r.estado !== "OK") return fallaDocumento(r);
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
  const r = usaApi()
    ? await nuevaVersionApi(id, a.data, v.data.nota, v.data.tipo)
    : nuevaVersion(almacen(), await idSesion(), id, a.data, v.data.nota, v.data.tipo);
  if (r.estado !== "OK") return fallaDocumento(r);
  invalidar();
  refresh();
  return { ok: true, mensaje: `Versión ${r.documento.version} publicada como vigente.` };
}

export async function eliminarDocumentoAccion(id: string): Promise<Respuesta> {
  const r = usaApi()
    ? await eliminarDocumentoApi(id)
    : eliminarDocumento(almacen(), await idSesion(), id);
  if (r.estado !== "OK") return fallaDocumento(r);
  await guardarAviso("Documento eliminado del repositorio.");
  invalidar();
  refresh();
  return ir("/contenido/documentos");
}

/* ---------- Inicio del portal ---------- */

const ERROR_INICIO: Record<string, string> = {
  NO_PUBLICADA: "La noticia elegida ya no está publicada. Recarga la página.",
  NO_ES_TEXTO: "El mensaje del alcalde tiene que ser una noticia de formato Texto.",
};

/** Guarda el mensaje del alcalde que muestra el Inicio. */
export async function guardarInicioAccion(datos: {
  mensajeAlcalde: string | null;
}): Promise<Respuesta> {
  await contenidoAlDia();
  const r = guardarInicio(almacen(), await idSesion(), { mensajeAlcalde: datos.mensajeAlcalde });
  if (r.estado === "SIN_SESION" || r.estado === "SIN_PERMISO") return COMUNES[r.estado];
  if (r.estado !== "OK") return { ok: false, mensaje: ERROR_INICIO[r.estado]! };
  invalidar();
  return { ok: true, mensaje: "Inicio actualizado: el portal ya muestra tu selección." };
}

/* ---------- Marco legal de Conoce el PDUL ---------- */

const ERROR_MARCO: Record<string, Respuesta> = {
  DEMASIADOS_ACTIVOS: {
    ok: false,
    errores: { activo: `Ya hay ${MAX_ACTIVOS} ítems en el portal: desactiva uno antes.` },
    mensaje: `El portal muestra hasta ${MAX_ACTIVOS} ítems a la vez.`,
  },
  DESTINO_NO_DISPONIBLE: {
    ok: false,
    errores: { "boton-destino-id": "Elige una noticia publicada o un documento público." },
    mensaje: "El botón tiene que llevar a contenido publicado.",
  },
  ORDEN_INVALIDO: {
    ok: false,
    mensaje: "La lista cambió mientras la ordenabas. Recarga la página.",
  },
};

function respuestaMarco(estado: string): Respuesta {
  return (
    ERROR_MARCO[estado] ??
    COMUNES[estado as keyof typeof COMUNES] ?? { ok: false, mensaje: "No se pudo guardar." }
  );
}

/** Crea un ítem (POST /admin/legal-framework). */
export async function crearItemMarcoAccion(datos: unknown): Promise<Respuesta> {
  const p = itemMarcoSchema.safeParse(datos);
  if (!p.success) return erroresDe(p.error.issues);
  await contenidoAlDia();
  const r = crearItemMarco(almacen(), await idSesion(), p.data);
  if (r.estado !== "OK") return respuestaMarco(r.estado);
  invalidar();
  refresh();
  return {
    ok: true,
    mensaje: r.item.activo
      ? "Ítem creado: ya aparece al final del Marco legal del portal."
      : "Ítem guardado sin mostrarse en el portal.",
  };
}

/** Edita un ítem: texto, botón y si se muestra (PATCH /admin/legal-framework/:id). */
export async function guardarItemMarcoAccion(id: string, datos: unknown): Promise<Respuesta> {
  const p = itemMarcoSchema.safeParse(datos);
  if (!p.success) return erroresDe(p.error.issues);
  await contenidoAlDia();
  const r = guardarItemMarco(almacen(), await idSesion(), String(id), p.data);
  if (r.estado !== "OK") return respuestaMarco(r.estado);
  invalidar();
  refresh();
  return { ok: true, mensaje: "Ítem guardado." };
}

/** Guarda el orden de los ítems activos (PUT /admin/legal-framework/order). */
export async function ordenarMarcoAccion(ids: unknown): Promise<Respuesta> {
  const lista = Array.isArray(ids) ? ids.map(String) : [];
  const r = ordenarMarco(almacen(), await idSesion(), lista);
  if (r.estado !== "OK") return respuestaMarco(r.estado);
  invalidar();
  refresh();
  return { ok: true, mensaje: "Orden guardado: el portal ya lo muestra así." };
}

/** Elimina un ítem (borrado lógico). */
export async function eliminarItemMarcoAccion(id: string): Promise<Respuesta> {
  const r = eliminarItemMarco(almacen(), await idSesion(), String(id));
  if (r.estado !== "OK") return respuestaMarco(r.estado);
  invalidar();
  refresh();
  return { ok: true, mensaje: "Ítem eliminado." };
}

/* ---------- Diapositivas de la tarjeta de transiciones del Inicio ---------- */

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
  await guardarAviso(
    id ? "Diapositiva actualizada." : "Diapositiva creada al final de la tarjeta.",
  );
  invalidar();
  refresh();
  return ir("/contenido/banners");
}

export async function eliminarBannerAccion(id: string): Promise<Respuesta> {
  const r = eliminarBanner(almacen(), await idSesion(), id);
  if (r.estado !== "OK") return COMUNES[r.estado];
  await guardarAviso("Diapositiva eliminada.");
  invalidar();
  refresh();
  return ir("/contenido/banners");
}

export async function ordenarBannersAccion(ids: string[]): Promise<Respuesta> {
  const r = ordenarBanners(almacen(), await idSesion(), ids);
  if (r.estado === "LISTA_INVALIDA")
    return {
      ok: false,
      mensaje: "Alguien del equipo cambió las diapositivas mientras ordenabas. Recarga la página.",
    };
  if (r.estado !== "OK") return COMUNES[r.estado];
  // Sin refresh: la lista ya muestra el orden nuevo y recargarla borraría el aviso.
  return { ok: true, mensaje: "Orden guardado: así se verán en el carrusel." };
}
