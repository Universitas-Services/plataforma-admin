import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import { ALCALDIA } from "@/config/alcaldia";
import type { Adjunto, CamposDocumento, DocEstado, Documento } from "@/lib/contenido/tipos";
import type { FiltrosDocumentos } from "@/lib/plataforma/documentos";
import type { Almacen } from "@/lib/plataforma/tipos";

/*
 * Repositorio de documentos contra plataforma-api (guía R8: /admin/documents, permiso
 * contenido.editar). Devuelven los mismos resultados que las funciones simuladas de
 * documentos.ts, así las páginas y las acciones no cambian. La API aplica las mismas reglas
 * (versión 1.0 al crear, menor y mayor, oficializar en la bitácora, borrado lógico).
 */

/** Documento tal como lo devuelve la API: sin alcaldía y con sus descargas contadas. */
type DocumentoApi = Omit<Documento, "alcaldiaId"> & { descargas?: number; descargaUrl?: string };

type Conteos = Record<DocEstado, number>;

type Pagina<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    conteos?: Conteos;
    totalGeneral?: number;
  };
};

export const deApi = ({ descargaUrl: _d, ...d }: DocumentoApi): Documento => ({
  ...d,
  alcaldiaId: ALCALDIA.id,
});

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

/**
 * Lo que la API rechaza de la ficha o de la versión: llega con los mismos textos del panel
 * («Escribe el título.»…). La categoría desconocida va al campo de la categoría.
 */
function rechazo(e: unknown) {
  if (e instanceof ErrorApi && e.code === "MEDIO_AJENO") return { estado: "MEDIO_AJENO" as const };
  if (e instanceof ErrorApi && e.code === "INVALID_CATALOG_VALUE")
    return {
      estado: "INVALIDO" as const,
      errores: { categoria: "Elige una categoría de la lista." },
    };
  if (e instanceof ErrorApi && e.code === "VALIDATION_ERROR") {
    const textos = Array.isArray(e.details) ? e.details.map(String) : [e.message];
    const errores: Record<string, string> = {};
    for (const t of textos) errores[campoDe(t)] ??= t;
    return { estado: "INVALIDO" as const, errores };
  }
  return comun(e);
}

/** El campo del formulario al que apunta un texto de validación de la API. */
function campoDe(texto: string) {
  const t = texto.toLowerCase();
  if (t.includes("título")) return "titulo";
  if (t.includes("descripción")) return "descripcion";
  if (t.includes("categoría")) return "categoria";
  if (t.includes("qué cambió") || t.includes("nota")) return "nota";
  return "archivo";
}

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

const ruta = (id: string) => `/admin/documents/${encodeURIComponent(id)}`;

/** El listado completo (recorre las páginas de 100), con los conteos de los chips. */
export async function listarDocumentosApi(f: FiltrosDocumentos = {}) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({
    estado: f.estado,
    categoria: f.categoria,
    visibilidad: f.visibilidad,
    q: f.q,
    desde: f.desde,
    hasta: f.hasta,
  }))
    if (v) p.set(k, v);
  p.set("limit", "100");
  try {
    const items: Documento[] = [];
    let conteos: Conteos = { BORRADOR: 0, OFICIAL: 0 };
    let total = 0;
    for (let pagina = 1; ; pagina++) {
      p.set("page", String(pagina));
      const r = await pedirApi<Pagina<DocumentoApi>>(`/admin/documents?${p}`, { token: t });
      items.push(...r.data.map(deApi));
      conteos = { ...conteos, ...r.meta.conteos };
      total = r.meta.totalGeneral ?? r.meta.total;
      if (pagina >= r.meta.totalPages) break;
    }
    return { estado: "OK" as const, items, conteos, total };
  } catch (e) {
    return comun(e) as { estado: "SIN_SESION" | "SIN_PERMISO" };
  }
}

export async function obtenerDocumentoApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    return {
      estado: "OK" as const,
      documento: deApi(await pedirApi<DocumentoApi>(ruta(id), { token: t })),
    };
  } catch (e) {
    return comun(e);
  }
}

export async function crearDocumentoApi(campos: CamposDocumento, archivo: Adjunto) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const d = await pedirApi<DocumentoApi>("/admin/documents", {
      metodo: "POST",
      token: t,
      cuerpo: { ...campos, archivo },
    });
    return { estado: "OK" as const, documento: deApi(d) };
  } catch (e) {
    return rechazo(e);
  }
}

/** Edita la ficha (no el archivo: eso es una versión nueva). El slug no cambia. */
export async function guardarDocumentoApi(id: string, campos: CamposDocumento) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const d = await pedirApi<DocumentoApi>(ruta(id), { metodo: "PATCH", token: t, cuerpo: campos });
    return { estado: "OK" as const, documento: deApi(d) };
  } catch (e) {
    return rechazo(e);
  }
}

export async function nuevaVersionApi(
  id: string,
  archivo: Adjunto,
  nota: string,
  tipo: "menor" | "mayor",
) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const d = await pedirApi<DocumentoApi>(`${ruta(id)}/versions`, {
      metodo: "POST",
      token: t,
      cuerpo: { archivo, nota: nota.trim(), tipo },
    });
    return { estado: "OK" as const, documento: deApi(d) };
  } catch (e) {
    return rechazo(e);
  }
}

export async function eliminarDocumentoApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi(ruta(id), { metodo: "DELETE", token: t });
    return { estado: "OK" as const };
  } catch (e) {
    return comun(e);
  }
}

/**
 * Refleja en el almacén los documentos de la API, para los módulos que todavía son simulados y
 * los eligen o los cuentan (Marco legal, Inicio, métricas). Con la API, los documentos del
 * almacén son solo este reflejo: los de ejemplo se quitan.
 */
export async function sincronizarDocumentosApi(alm: Almacen) {
  const r = await listarDocumentosApi();
  if (r.estado !== "OK") return;
  const ids = new Set(r.items.map((d) => d.id));
  for (const id of alm.documentos.keys()) if (!ids.has(id)) alm.documentos.delete(id);
  for (const d of r.items) alm.documentos.set(d.id, d);
}
