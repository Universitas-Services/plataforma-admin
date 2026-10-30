import "server-only";
import { conBom, ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import { ALCALDIA } from "@/config/alcaldia";
import {
  cuandoRecibida,
  type ConteosBandeja,
  type FiltrosBandeja,
  type ResultadoRevisor,
} from "@/lib/plataforma/participaciones";
import type {
  AutorAporte,
  EstadoParticipacion,
  MotivoRechazo,
  Participacion,
  ParticipacionDemo,
  TipoParticipacion,
} from "@/lib/plataforma/tipos";
import { TIPOS_PARTICIPACION } from "@/lib/plataforma/tipos";

/*
 * Bandeja del Revisor contra plataforma-api (guía R11: /admin/participations, permiso
 * participaciones.evaluar). Devuelve las mismas formas que el almacén simulado de
 * participaciones.ts, así las páginas y las acciones no cambian: los errores se traducen a los
 * ResultadoRevisor de siempre.
 */

/** Fila de GET /admin/participations: el documento del autor ya viene enmascarado. */
export type FilaApi = {
  folio: string;
  tipo: TipoParticipacion;
  estado: EstadoParticipacion;
  recibidaEl: string;
  /** Desde cuándo está en su estado actual (o `recibidaEl` si nunca cambió). */
  estadoDesde?: string;
  publicadaEl?: string;
  noticia?: { slug: string; titulo: string };
  parroquia: string;
  sector: string;
  categoriaTecnica: string;
  mostrarNombre: boolean;
  autor: { tipo: AutorAporte["tipo"]; nombre: string; documento: string };
};

type PaginaApi = {
  data: FilaApi[];
  meta: { page: number; limit: number; total: number; totalPages: number; conteos: ConteosBandeja };
};

/** Detalle de GET /admin/participations/{folio}: el modelo del panel sin la alcaldía. */
type DetalleApi = Omit<Participacion, "alcaldiaId" | "ejemplo" | "historial"> & {
  historial: (Omit<Participacion["historial"][number], "motivo"> & { motivo?: string })[];
};

const DIA = 86_400_000;

/** La fila de la bandeja: los días son los que lleva en su estado actual (`estadoDesde`). */
export const filaDeApi = (f: FilaApi, ahora = Date.now()): ParticipacionDemo => ({
  folio: f.folio,
  tipo: TIPOS_PARTICIPACION[f.tipo],
  tipoClave: f.tipo,
  autor: f.autor.nombre,
  parroquia: f.parroquia,
  categoriaTecnica: f.categoriaTecnica,
  dias: Math.max(0, Math.floor((ahora - Date.parse(f.estadoDesde ?? f.recibidaEl)) / DIA)),
  recibida: cuandoRecibida(f.recibidaEl, ahora),
  estado: f.estado,
});

export const detalleDeApi = (d: DetalleApi): Participacion => ({
  ...d,
  alcaldiaId: ALCALDIA.id,
  imagenes: d.imagenes ?? [],
  notas: d.notas ?? [],
  autor: { ...d.autor, documentos: d.autor.documentos ?? [] },
  historial: d.historial.map((h) => ({ ...h, motivo: h.motivo as MotivoRechazo | undefined })),
});

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

type Fallo = "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE";

/** Errores comunes de la API → el resultado del almacén simulado. */
function comun(e: unknown): Fallo {
  if (e instanceof ErrorApi) {
    if (e.status === 401) return "SIN_SESION";
    if (e.status === 403) return "SIN_PERMISO";
    if (e.status === 404) return "NO_EXISTE";
  }
  throw e;
}

/** Los filtros como los espera la API. */
export function consultaBandeja(f: FiltrosBandeja, extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({
    estado: f.estado,
    tipo: f.tipo,
    parroquia: f.parroquia,
    categoria: f.categoria,
    q: f.q,
    desde: f.desde,
    hasta: f.hasta,
    sort: f.orden,
  }))
    if (v) p.set(k, v);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
}

/** Una página de la bandeja, con los conteos de los chips. */
export async function listarParticipacionesApi(f: FiltrosBandeja, pagina = 1, limite = 50) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const r = await pedirApi<PaginaApi>(
      `/admin/participations?${consultaBandeja(f, { page: pagina, limit: limite })}`,
      { token: t },
    );
    return { estado: "OK" as const, filas: r.data, meta: r.meta };
  } catch (e) {
    return { estado: comun(e) };
  }
}

export async function obtenerParticipacionApi(folio: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const d = await pedirApi<DetalleApi>(
      `/admin/participations/${encodeURIComponent(folio.toUpperCase())}`,
      { token: t },
    );
    return { estado: "OK" as const, participacion: detalleDeApi(d) };
  } catch (e) {
    return { estado: comun(e) };
  }
}

/** Errores del Revisor de la API → el resultado de siempre. */
function deRevisor(e: unknown): Exclude<ResultadoRevisor, "OK"> {
  if (e instanceof ErrorApi) {
    if (e.code === "INVALID_TRANSITION") return "TRANSICION_INVALIDA";
    if (e.code === "MOTIVO_REQUERIDO") return "SIN_MOTIVO";
    if (e.code === "TEXTO_CORTO") return "TEXTO_CORTO";
    if (e.code === "NOTA_VACIA") return "NOTA_VACIA";
  }
  return comun(e);
}

/**
 * Cambia el estado. El rechazo lleva el motivo (`motivoCodigo`) y el texto para el ciudadano
 * (`comentario`); los demás cambios, el comentario opcional.
 */
export async function cambiarEstadoApi(
  folio: string,
  destino: EstadoParticipacion,
  datos: { motivo?: string; texto?: string; comentario?: string } = {},
): Promise<ResultadoRevisor> {
  const t = await token();
  if (!t) return "SIN_SESION";
  const rechazo = destino === "RECHAZADA";
  const comentario = (rechazo ? datos.texto : datos.comentario)?.trim() || undefined;
  try {
    await pedirApi(`/admin/participations/${encodeURIComponent(folio)}/transitions`, {
      token: t,
      cuerpo: {
        estado: destino,
        ...(rechazo && datos.motivo ? { motivoCodigo: datos.motivo } : {}),
        ...(comentario ? { comentario } : {}),
      },
    });
    return "OK";
  } catch (e) {
    return deRevisor(e);
  }
}

export async function agregarNotaApi(folio: string, texto: string): Promise<ResultadoRevisor> {
  const t = await token();
  if (!t) return "SIN_SESION";
  const limpio = texto.trim().slice(0, 1000);
  if (!limpio) return "NOTA_VACIA";
  try {
    await pedirApi(`/admin/participations/${encodeURIComponent(folio)}/notes`, {
      token: t,
      cuerpo: { texto: limpio },
    });
    return "OK";
  } catch (e) {
    return deRevisor(e);
  }
}

/**
 * URL firmada (5 minutos) de una foto o del soporte (`adjunto`) o de un documento del autor
 * (`documento`). Cada pedido queda en la bitácora de la API.
 */
export async function urlArchivoApi(folio: string, id: string, tipo: "adjunto" | "documento") {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  const tramo = tipo === "documento" ? "documents" : "files";
  try {
    const r = await pedirApi<{ url: string; expiraEl: string }>(
      `/admin/participations/${encodeURIComponent(folio)}/${tramo}/${encodeURIComponent(id)}/url`,
      { token: t },
    );
    return { estado: "OK" as const, url: r.url };
  } catch (e) {
    return { estado: comun(e) };
  }
}

/** El CSV de la API tal cual (ya enmascarado, con BOM y «;»). Queda en la bitácora. */
export async function exportarCsvApi(f: FiltrosBandeja) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const csv = await pedirApi<string>(`/admin/participations/export.csv?${consultaBandeja(f)}`, {
      token: t,
      crudo: true,
    });
    return { estado: "OK" as const, csv: conBom(csv) };
  } catch (e) {
    return { estado: comun(e) };
  }
}
