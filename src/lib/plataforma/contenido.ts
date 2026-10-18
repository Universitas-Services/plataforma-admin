import { permisosDe } from "./permisos";
import { nombreCompleto, nuevoId, registrar } from "./servicio";
import type { Alcaldia, Almacen, UsuarioInterno } from "./tipos";
import { sanearHtml, textoDe } from "@/lib/contenido/sanear";
import {
  LIMITES_MEDIO,
  urlMedio,
  type CamposNoticia,
  type ClaseMedio,
  type EstadoNoticia,
  type Imagen,
  type Noticia,
  type TipoMedio,
} from "@/lib/contenido/tipos";
import { enlaceVideo } from "@/lib/contenido/video";

/*
 * Noticias e información del Operador (backlog 1.13, 1.17 y 2.9) sobre el almacén en memoria.
 * Lógica pura, como servicio.ts: la hora llega por parámetro y se prueba con Vitest.
 */

const MINUTO = 60 * 1000;
/** Ediciones seguidas de la misma persona cuentan como una sola en la bitácora. */
const VENTANA_EDICION = 30 * MINUTO;
export const MAX_TITULO = 160;
export const MAX_RESUMEN = 300;

type Editor =
  | { estado: "OK"; usuario: UsuarioInterno; alcaldia: Alcaldia }
  | { estado: "SIN_SESION" }
  | { estado: "SIN_PERMISO" };

/** Edita contenido quien tiene `contenido.editar` en la alcaldía activa (Operador o Admin). */
function editor(alm: Almacen, sesion?: string): Editor {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  const u = s ? alm.usuarios.get(s.usuarioId) : undefined;
  const a = s?.alcaldiaId ? alm.alcaldias.get(s.alcaldiaId) : undefined;
  if (!u || !u.activo || !a) return { estado: "SIN_SESION" };
  if (a.estado !== "ACTIVA" || !permisosDe(u, a.id).has("contenido.editar"))
    return { estado: "SIN_PERMISO" };
  return { estado: "OK", usuario: u, alcaldia: a };
}

/* ---------- Slug ---------- */

export const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function slugDe(titulo: string) {
  return (
    sinTildes(titulo)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/, "") || "noticia"
  );
}

function slugUnico(alm: Almacen, alcaldiaId: string, titulo: string, propioId: string) {
  const base = slugDe(titulo);
  const usados = new Set(
    [...alm.noticias.values()]
      .filter((n) => n.alcaldiaId === alcaldiaId && n.id !== propioId)
      .map((n) => n.slug),
  );
  let slug = base;
  for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/* ---------- Publicación programada (el «job» de la API) ---------- */

/** Publica las programadas cuya hora ya pasó. La API lo hará con un job; aquí, al leer. */
export function publicarVencidas(alm: Almacen, alcaldiaId: string, ahora = Date.now()) {
  for (const n of alm.noticias.values()) {
    if (n.alcaldiaId !== alcaldiaId || n.estado !== "PROGRAMADO" || !n.publicarEl) continue;
    if (Date.parse(n.publicarEl) > ahora) continue;
    const antes = n.estado;
    n.estado = "PUBLICADO";
    n.publicadoEl = n.publicarEl;
    n.publicarEl = undefined;
    registrar(
      alm,
      {
        actorId: "sistema",
        alcaldiaId,
        accion: "NOTICIA_PUBLICADA",
        entidad: "noticia",
        antes: { id: n.id, estado: antes },
        despues: { id: n.id, estado: n.estado, programada: true },
      },
      ahora,
    );
  }
}

/* ---------- Listado ---------- */

export const ORDENES = ["recientes", "antiguas", "titulo"] as const;
export type Orden = (typeof ORDENES)[number];

export type FiltrosNoticias = {
  estado?: EstadoNoticia;
  tipo?: Noticia["tipo"];
  categoria?: string;
  formato?: Noticia["formato"];
  q?: string;
  /** AAAA-MM-DD, inclusive, sobre la fecha relevante de cada noticia. */
  desde?: string;
  hasta?: string;
  orden?: Orden;
};

/** La fecha que importa en cada estado: publicada, programada o la última edición. */
export const fechaRelevante = (n: Noticia) => n.publicadoEl ?? n.publicarEl ?? n.actualizadoEl;

export type FilaNoticia = Noticia & { autor: string };

export type ResultadoListado =
  | { estado: "OK"; items: FilaNoticia[]; conteos: Record<EstadoNoticia, number>; total: number }
  | { estado: "SIN_SESION" | "SIN_PERMISO" };

export function listarNoticias(
  alm: Almacen,
  sesion: string | undefined,
  f: FiltrosNoticias = {},
  ahora = Date.now(),
): ResultadoListado {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  publicarVencidas(alm, c.alcaldia.id, ahora);
  const todas = [...alm.noticias.values()].filter(
    (n) => n.alcaldiaId === c.alcaldia.id && !n.eliminadaEl,
  );
  const q = f.q ? sinTildes(f.q).toLowerCase().trim() : "";
  const desde = f.desde ? Date.parse(`${f.desde}T00:00:00-04:00`) : undefined;
  const hasta = f.hasta ? Date.parse(`${f.hasta}T23:59:59.999-04:00`) : undefined;

  // Los conteos de los chips respetan los demás filtros, no el de estado.
  const sinEstado = todas.filter((n) => {
    const fecha = Date.parse(fechaRelevante(n));
    return (
      (!f.tipo || n.tipo === f.tipo) &&
      (!f.categoria || n.categoria === f.categoria) &&
      (!f.formato || n.formato === f.formato) &&
      (!q || sinTildes(n.titulo).toLowerCase().includes(q)) &&
      (desde === undefined || fecha >= desde) &&
      (hasta === undefined || fecha <= hasta)
    );
  });
  const conteos = { BORRADOR: 0, PROGRAMADO: 0, PUBLICADO: 0, DESPUBLICADO: 0 };
  for (const n of sinEstado) conteos[n.estado]++;

  const orden = f.orden ?? "recientes";
  const items = sinEstado
    .filter((n) => !f.estado || n.estado === f.estado)
    .sort((a, b) =>
      orden === "titulo"
        ? a.titulo.localeCompare(b.titulo, "es")
        : (Date.parse(fechaRelevante(b)) - Date.parse(fechaRelevante(a))) *
          (orden === "antiguas" ? -1 : 1),
    )
    .map((n) => {
      const u = alm.usuarios.get(n.autorId);
      return { ...n, autor: u ? nombreCompleto(u) : "—" };
    });
  return { estado: "OK", items, conteos, total: todas.length };
}

export type ResultadoNoticia =
  { estado: "OK"; noticia: Noticia } | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" };

export function obtenerNoticia(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  ahora = Date.now(),
): ResultadoNoticia {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  publicarVencidas(alm, c.alcaldia.id, ahora);
  const n = alm.noticias.get(id);
  if (!n || n.alcaldiaId !== c.alcaldia.id || n.eliminadaEl) return { estado: "NO_EXISTE" };
  return { estado: "OK", noticia: n };
}

/* ---------- Crear y guardar ---------- */

export function crearNoticia(
  alm: Almacen,
  sesion: string | undefined,
  ahora = Date.now(),
): { estado: "OK"; id: string } | { estado: "SIN_SESION" | "SIN_PERMISO" } {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const fecha = new Date(ahora).toISOString();
  const n: Noticia = {
    id: nuevoId(),
    alcaldiaId: c.alcaldia.id,
    slug: "",
    tipo: "NOTICIA",
    formato: "TEXTO",
    titulo: "",
    resumen: "",
    cuerpo: "",
    imagenes: [],
    destacada: false,
    estado: "BORRADOR",
    autorId: c.usuario.id,
    creadoEl: fecha,
    actualizadoEl: fecha,
  };
  n.slug = slugUnico(alm, c.alcaldia.id, "noticia", n.id);
  alm.noticias.set(n.id, n);
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "NOTICIA_CREADA",
      entidad: "noticia",
      despues: { id: n.id, estado: n.estado },
    },
    ahora,
  );
  return { estado: "OK", id: n.id };
}

/** Un archivo del propio panel: de los medios de esta alcaldía o de los ejemplos. */
function medioPropio(alm: Almacen, alcaldiaId: string, url: string | undefined) {
  if (!url) return true;
  if (/^\/ejemplos\/[\w.-]+$/.test(url)) return true;
  const id = url.match(/^\/medios\/([\w-]+)$/)?.[1];
  return Boolean(id && alm.medios.get(id)?.alcaldiaId === alcaldiaId);
}

function mediosPropios(alm: Almacen, alcaldiaId: string, c: CamposNoticia) {
  const urls = [
    c.portada?.src,
    ...c.imagenes.map((i) => i.src),
    c.adjunto?.url,
    c.video?.fuente === "ARCHIVO" ? c.video.url : undefined,
    c.video?.subtitulos,
    c.video?.portada?.src,
  ];
  return urls.every((u) => medioPropio(alm, alcaldiaId, u));
}

const imagenCompleta = (i?: Imagen) => Boolean(i?.src && i.alt.trim());

/**
 * Lo que falta para publicar o programar, por campo. Un borrador se guarda con cualquier cosa;
 * lo que exige cada formato se comprueba aquí.
 */
export function faltantesPublicacion(n: CamposNoticia): Record<string, string> {
  const e: Record<string, string> = {};
  if (!n.titulo.trim()) e.titulo = "Escribe el título.";
  if (!n.resumen.trim()) e.resumen = "Escribe el resumen: es lo que se ve en el listado.";
  if (!n.categoria) e.categoria = "Elige la categoría.";
  if (n.portada && !n.portada.alt.trim()) e.portada = "Describe la portada (texto alternativo).";
  switch (n.formato) {
    case "TEXTO":
      if (!textoDe(n.cuerpo)) e.cuerpo = "Escribe el cuerpo de la noticia.";
      break;
    case "IMAGEN":
      if (!imagenCompleta(n.portada))
        e.portada = "Sube la imagen de portada y describe lo que muestra.";
      break;
    case "GALERIA":
      if (n.imagenes.length < 2) e.imagenes = "Una galería necesita al menos 2 imágenes.";
      else if (!n.imagenes.every(imagenCompleta))
        e.imagenes = "Describe cada imagen de la galería (texto alternativo).";
      break;
    case "DOCUMENTO":
      if (!n.adjunto) e.adjunto = "Sube el documento en PDF.";
      break;
    case "VIDEO":
      if (!n.video) e.video = "Sube el video o pega el enlace de YouTube o Instagram.";
      else if (n.video.fuente !== "ARCHIVO" && !enlaceVideo(n.video.url))
        e.video = "El enlace no es de YouTube ni de una publicación de Instagram.";
      else if (n.video.portada && !n.video.portada.alt.trim())
        e.video = "Describe la portada del video (texto alternativo).";
      break;
  }
  return e;
}

/** Ya visible o con fecha: lo que se guarda tiene que estar completo. */
const exigeCompleta = (e: EstadoNoticia) => e === "PUBLICADO" || e === "PROGRAMADO";

export type ResultadoGuardar =
  | { estado: "OK"; noticia: Noticia }
  | { estado: "INCOMPLETA"; errores: Record<string, string> }
  | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" | "MEDIO_AJENO" };

export function guardarNoticia(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  campos: CamposNoticia,
  ahora = Date.now(),
): ResultadoGuardar {
  const r = obtenerNoticia(alm, sesion, id, ahora);
  if (r.estado !== "OK") return r;
  const c = editor(alm, sesion) as Extract<Editor, { estado: "OK" }>;
  const n = r.noticia;
  if (!mediosPropios(alm, n.alcaldiaId, campos)) return { estado: "MEDIO_AJENO" };

  const limpio: CamposNoticia = {
    ...campos,
    titulo: campos.titulo.trim(),
    resumen: campos.resumen.trim(),
    parroquia: campos.parroquia?.trim() || undefined,
    cuerpo: sanearHtml(campos.cuerpo),
    // Un enlace de video se guarda normalizado.
    video:
      campos.video && campos.video.fuente !== "ARCHIVO"
        ? { ...campos.video, ...(enlaceVideo(campos.video.url) ?? { url: campos.video.url }) }
        : campos.video,
  };
  if (exigeCompleta(n.estado)) {
    const errores = faltantesPublicacion(limpio);
    if (Object.keys(errores).length) return { estado: "INCOMPLETA", errores };
  }

  Object.assign(n, limpio, { actualizadoEl: new Date(ahora).toISOString() });
  // La dirección no cambia una vez publicada (enlaces compartidos).
  if (!n.publicadoEl && n.titulo) n.slug = slugUnico(alm, n.alcaldiaId, n.titulo, n.id);

  const ultimo = alm.bitacora.findLast(
    (e) => e.entidad === "noticia" && (e.despues as { id?: string } | undefined)?.id === n.id,
  );
  const seguida =
    ultimo?.accion === "NOTICIA_EDITADA" &&
    ultimo.actorId === c.usuario.id &&
    ahora - Date.parse(ultimo.fecha) < VENTANA_EDICION;
  if (!seguida)
    registrar(
      alm,
      {
        actorId: c.usuario.id,
        alcaldiaId: n.alcaldiaId,
        accion: "NOTICIA_EDITADA",
        entidad: "noticia",
        despues: { id: n.id, titulo: n.titulo, estado: n.estado },
      },
      ahora,
    );
  return { estado: "OK", noticia: n };
}

/* ---------- Cambios de estado ---------- */

export type ResultadoEstado =
  | { estado: "OK"; noticia: Noticia }
  | { estado: "INCOMPLETA"; errores: Record<string, string> }
  | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" | "TRANSICION" | "FECHA_PASADA" };

const DESDE: Record<string, readonly EstadoNoticia[]> = {
  publicar: ["BORRADOR", "PROGRAMADO", "DESPUBLICADO"],
  programar: ["BORRADOR", "PROGRAMADO", "DESPUBLICADO"],
  aBorrador: ["PROGRAMADO"],
  despublicar: ["PUBLICADO"],
  eliminar: ["BORRADOR"],
};

const ACCION_BITACORA = {
  publicar: "NOTICIA_PUBLICADA",
  programar: "NOTICIA_PROGRAMADA",
  aBorrador: "NOTICIA_A_BORRADOR",
  despublicar: "NOTICIA_DESPUBLICADA",
  eliminar: "NOTICIA_ELIMINADA",
} as const;

export type CambioEstado = keyof typeof ACCION_BITACORA;

/**
 * Publicar ahora, programar (fecha futura), devolver una programada a borrador, despublicar o
 * eliminar un borrador (borrado lógico). Publicar y programar exigen la noticia completa.
 */
export function cambiarEstadoNoticia(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  cambio: CambioEstado,
  opciones: { publicarEl?: string } = {},
  ahora = Date.now(),
): ResultadoEstado {
  const r = obtenerNoticia(alm, sesion, id, ahora);
  if (r.estado !== "OK") return r;
  const c = editor(alm, sesion) as Extract<Editor, { estado: "OK" }>;
  const n = r.noticia;
  if (!DESDE[cambio]!.includes(n.estado)) return { estado: "TRANSICION" };

  if (cambio === "publicar" || cambio === "programar") {
    const errores = faltantesPublicacion(n);
    if (Object.keys(errores).length) return { estado: "INCOMPLETA", errores };
  }
  const fecha = new Date(ahora).toISOString();
  const antes = { id: n.id, estado: n.estado, publicarEl: n.publicarEl };

  switch (cambio) {
    case "publicar":
      n.estado = "PUBLICADO";
      n.publicadoEl = fecha;
      n.publicarEl = undefined;
      break;
    case "programar": {
      const cuando = opciones.publicarEl ? Date.parse(opciones.publicarEl) : NaN;
      if (!Number.isFinite(cuando) || cuando <= ahora + MINUTO) return { estado: "FECHA_PASADA" };
      n.estado = "PROGRAMADO";
      n.publicarEl = new Date(cuando).toISOString();
      break;
    }
    case "aBorrador":
      n.estado = "BORRADOR";
      n.publicarEl = undefined;
      break;
    case "despublicar":
      n.estado = "DESPUBLICADO";
      break;
    case "eliminar":
      n.eliminadaEl = fecha;
      break;
  }
  n.actualizadoEl = fecha;
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: n.alcaldiaId,
      accion: ACCION_BITACORA[cambio],
      entidad: "noticia",
      antes,
      despues: { id: n.id, titulo: n.titulo, estado: n.estado, publicarEl: n.publicarEl },
    },
    ahora,
  );
  return { estado: "OK", noticia: n };
}

/* ---------- Medios ---------- */

/** Tipo real por la firma del archivo (backlog 1.17), no por lo que dice el navegador. */
export function tipoMedio(bytes: Uint8Array): TipoMedio | undefined {
  const b = (i: number) => bytes[i] ?? -1;
  const ascii = (desde: number, hasta: number) => String.fromCharCode(...bytes.slice(desde, hasta));
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (ascii(4, 8) === "ftyp") return "video/mp4";
  if (b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3) return "video/webm";
  const texto = new TextDecoder().decode(bytes.slice(0, 16)).replace(/^﻿/, "");
  if (/^WEBVTT(\s|$)/.test(texto)) return "text/vtt";
  return undefined;
}

export type ResultadoMedio =
  | { estado: "OK"; id: string; url: string; tipo: TipoMedio; nombre: string; peso: number }
  | { estado: "SIN_SESION" | "SIN_PERMISO" | "VACIO" | "MUY_GRANDE" | "FORMATO" };

export function guardarMedio(
  alm: Almacen,
  sesion: string | undefined,
  clase: ClaseMedio,
  nombre: string,
  bytes: Uint8Array,
  ahora = Date.now(),
): ResultadoMedio {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  if (!bytes.length) return { estado: "VACIO" };
  const limite = LIMITES_MEDIO[clase];
  if (bytes.length > limite.max) return { estado: "MUY_GRANDE" };
  const tipo = tipoMedio(bytes);
  if (!tipo || !limite.tipos.includes(tipo)) return { estado: "FORMATO" };
  const id = nuevoId();
  const limpio = nombre.replace(/[^\p{L}\p{N} ._()-]/gu, "").slice(0, 120) || "archivo";
  alm.medios.set(id, {
    id,
    alcaldiaId: c.alcaldia.id,
    tipo,
    nombre: limpio,
    bytes,
    subidoEl: new Date(ahora).toISOString(),
  });
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "MEDIO_SUBIDO",
      entidad: "medio",
      despues: { id, tipo, nombre: limpio, tamano: bytes.length },
    },
    ahora,
  );
  return { estado: "OK", id, url: urlMedio(id), tipo, nombre: limpio, peso: bytes.length };
}

/** Un medio solo se sirve a quien opera en su alcaldía (los públicos los servirá el portal). */
export function medioDe(alm: Almacen, sesion: string | undefined, id: string) {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  const m = alm.medios.get(id);
  return m && s?.alcaldiaId === m.alcaldiaId ? m : undefined;
}
