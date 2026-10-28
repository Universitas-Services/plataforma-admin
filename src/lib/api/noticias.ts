import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import { ALCALDIA } from "@/config/alcaldia";
import type { CamposNoticia, EstadoNoticia, Noticia } from "@/lib/contenido/tipos";
import type { CambioEstado, FiltrosNoticias, FilaNoticia } from "@/lib/plataforma/contenido";
import type { Almacen, ConteoDia } from "@/lib/plataforma/tipos";

/*
 * Noticias del panel contra plataforma-api (guía R7: /admin/posts, permiso contenido.editar).
 * Devuelven los mismos resultados que las funciones simuladas de contenido.ts, así las páginas
 * y las acciones no cambian: los errores de la API se traducen a SIN_SESION, SIN_PERMISO,
 * NO_EXISTE, INCOMPLETA (con los mismos campos), TRANSICION y MEDIO_AJENO.
 */

/** Noticia tal como la devuelve la API: autor como objeto (o nombre en las filas) y totales. */
type NoticiaApi = Omit<Noticia, "autorId" | "alcaldiaId" | "creadoEl"> & {
  autor: { id: string; nombre: string } | string | null;
  creadoEl?: string;
  totales?: ConteoDia;
};

type Pagina<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; conteos?: Conteos };
};
type Conteos = Record<EstadoNoticia, number>;

/** Estado corto que responden guardar y los cambios de estado. */
export type EstadoCorto = { actualizadoEl: string; estado: EstadoNoticia; slug: string };

export type NoticiaPanel = Noticia & { totales?: ConteoDia };

export function deApi(n: NoticiaApi): NoticiaPanel & { autor: string } {
  const autor = typeof n.autor === "string" ? n.autor : (n.autor?.nombre ?? "—");
  return {
    ...n,
    imagenes: n.imagenes ?? [],
    cuerpo: n.cuerpo ?? "",
    destacada: Boolean(n.destacada),
    alcaldiaId: ALCALDIA.id,
    autorId: typeof n.autor === "object" && n.autor ? n.autor.id : "",
    creadoEl: n.creadoEl ?? n.actualizadoEl,
    autor: autor || "—",
  };
}

type Fallo = "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE";

/** Errores comunes de la API → el resultado del almacén simulado. */
function comun(e: unknown): { estado: Fallo } {
  if (e instanceof ErrorApi) {
    if (e.status === 401) return { estado: "SIN_SESION" };
    if (e.status === 403) return { estado: "SIN_PERMISO" };
    if (e.status === 404) return { estado: "NO_EXISTE" };
  }
  throw e;
}

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

const CONTEOS_VACIOS: Conteos = { BORRADOR: 0, PROGRAMADO: 0, PUBLICADO: 0, DESPUBLICADO: 0 };

/** El listado completo (recorre las páginas de 100), con los conteos de las pestañas. */
export async function listarNoticiasApi(f: FiltrosNoticias = {}) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({
    estado: f.estado,
    tipo: f.tipo,
    categoria: f.categoria,
    formato: f.formato,
    q: f.q,
    desde: f.desde,
    hasta: f.hasta,
    sort: f.orden ?? "recientes",
  }))
    if (v) p.set(k, v);
  p.set("limit", "100");
  try {
    const items: (FilaNoticia & { totales?: ConteoDia })[] = [];
    let conteos = CONTEOS_VACIOS;
    for (let pagina = 1; ; pagina++) {
      p.set("page", String(pagina));
      const r = await pedirApi<Pagina<NoticiaApi>>(`/admin/posts?${p}`, { token: t });
      items.push(...r.data.map(deApi));
      conteos = { ...CONTEOS_VACIOS, ...r.meta.conteos };
      if (pagina >= r.meta.totalPages) break;
    }
    // Las pestañas cuentan con los demás filtros: su suma es el total sin el filtro de estado.
    const total = Object.values(conteos).reduce((s, n) => s + n, 0);
    return { estado: "OK" as const, items, conteos, total };
  } catch (e) {
    return comun(e) as { estado: "SIN_SESION" | "SIN_PERMISO" };
  }
}

export async function obtenerNoticiaApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const n = await pedirApi<NoticiaApi>(`/admin/posts/${encodeURIComponent(id)}`, { token: t });
    return { estado: "OK" as const, noticia: deApi(n) as NoticiaPanel };
  } catch (e) {
    return comun(e);
  }
}

export async function crearNoticiaApi() {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const r = await pedirApi<{ id: string }>("/admin/posts", { metodo: "POST", token: t });
    return { estado: "OK" as const, id: r.id };
  } catch (e) {
    return comun(e) as { estado: "SIN_SESION" | "SIN_PERMISO" };
  }
}

/** details.campos de 422 INCOMPLETE: las mismas claves y textos que el editor ya conoce. */
const camposDe = (e: ErrorApi) =>
  ((e.details as { campos?: Record<string, string> } | undefined)?.campos ?? {}) as Record<
    string,
    string
  >;

export async function guardarNoticiaApi(id: string, campos: CamposNoticia) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const r = await pedirApi<EstadoCorto>(`/admin/posts/${encodeURIComponent(id)}`, {
      metodo: "PATCH",
      token: t,
      cuerpo: campos,
    });
    return { estado: "OK" as const, noticia: r };
  } catch (e) {
    if (e instanceof ErrorApi && e.code === "INCOMPLETE")
      return { estado: "INCOMPLETA" as const, errores: camposDe(e) };
    if (e instanceof ErrorApi && e.code === "INVALID_CATALOG_VALUE")
      return {
        estado: "INCOMPLETA" as const,
        errores: { categoria: "Elige una categoría de la lista." },
      };
    if (e instanceof ErrorApi && e.code === "MEDIO_AJENO")
      return { estado: "MEDIO_AJENO" as const };
    return comun(e);
  }
}

const RUTA: Record<Exclude<CambioEstado, "eliminar">, string> = {
  publicar: "publish",
  programar: "schedule",
  aBorrador: "unschedule",
  despublicar: "unpublish",
};

export async function cambiarEstadoApi(id: string, cambio: CambioEstado, publicarEl?: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  const base = `/admin/posts/${encodeURIComponent(id)}`;
  try {
    if (cambio === "eliminar") {
      await pedirApi(base, { metodo: "DELETE", token: t });
      return {
        estado: "OK" as const,
        noticia: { actualizadoEl: new Date().toISOString(), estado: "BORRADOR", slug: "" },
      };
    }
    const r = await pedirApi<EstadoCorto>(`${base}/${RUTA[cambio]}`, {
      metodo: "POST",
      token: t,
      cuerpo: cambio === "programar" ? { publicarEl } : undefined,
    });
    return { estado: "OK" as const, noticia: r };
  } catch (e) {
    if (e instanceof ErrorApi && e.code === "INCOMPLETE") {
      const errores = camposDe(e);
      // Una fecha pasada llega como INCOMPLETE con solo publicarEl.
      return Object.keys(errores).length === 1 && errores.publicarEl
        ? { estado: "FECHA_PASADA" as const, errores }
        : { estado: "INCOMPLETA" as const, errores };
    }
    if (e instanceof ErrorApi && e.code === "INVALID_TRANSITION")
      return { estado: "TRANSICION" as const };
    return comun(e);
  }
}

/** Las noticias publicadas, para los módulos simulados que eligen una (Inicio, Marco legal). */
export async function noticiasPublicadasApi(): Promise<NoticiaPanel[]> {
  const r = await listarNoticiasApi({ estado: "PUBLICADO" });
  return r.estado === "OK" ? r.items : [];
}

/**
 * Refleja en el almacén las noticias publicadas de la API, para los módulos que todavía son
 * simulados y eligen o cuentan noticias (Inicio, Marco legal, métricas). Con la API, las
 * noticias del almacén son solo este reflejo: las de ejemplo se quitan.
 */
export async function sincronizarNoticiasApi(alm: Almacen) {
  const publicadas = await noticiasPublicadasApi();
  const ids = new Set(publicadas.map((n) => n.id));
  for (const id of alm.noticias.keys()) if (!ids.has(id)) alm.noticias.delete(id);
  for (const n of publicadas) alm.noticias.set(n.id, n);
}
