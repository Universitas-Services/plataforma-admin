import "server-only";
import { conBom, ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import { ALCALDIA } from "@/config/alcaldia";
import type { FiltrosCiudadanos } from "@/lib/plataforma/alcaldia";
import type { Ciudadano, DocumentoAutor } from "@/lib/plataforma/tipos";

/*
 * Ciudadanos de la alcaldía contra plataforma-api (guía R13 §3: /admin/citizens). Devuelve el
 * Ciudadano del panel: la API dice `cuenta` donde el panel dice `membresia` y `perfilEstado`
 * donde dice `perfilCompleto`. El documento de la lista ya viene enmascarado.
 */

type FilaApi = {
  id: string;
  tipo: Ciudadano["tipo"];
  nombre: string;
  correo: string;
  documento: string;
  telefono?: string;
  perfilEstado: "COMPLETO" | "INCOMPLETO";
  cuenta: Ciudadano["membresia"];
  bajaSolicitadaEl?: string;
  anonimizadoEl?: string;
  registradoEl: string;
};

type DetalleApi = FilaApi & {
  cedula?: string;
  rif?: string;
  ocupacion?: string;
  tipoEntidad?: string;
  representante?: Ciudadano["representante"];
  documentos?: (DocumentoAutor & { id: string })[];
  participaciones?: NonNullable<Ciudadano["participaciones"]>;
};

type PaginaApi = {
  data: FilaApi[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
    conteos: Record<"ACTIVA" | "SUSPENDIDA", number>;
  };
};

export const ciudadanoDeApi = (f: FilaApi | DetalleApi): Ciudadano => ({
  id: f.id,
  alcaldiaId: ALCALDIA.id,
  tipo: f.tipo,
  nombre: f.nombre,
  correo: f.correo,
  documento: f.documento,
  telefono: f.telefono,
  perfilCompleto: f.perfilEstado === "COMPLETO",
  membresia: f.cuenta,
  bajaSolicitadaEl: f.bajaSolicitadaEl,
  anonimizadoEl: f.anonimizadoEl,
  registradoEl: f.registradoEl,
  documentos: "documentos" in f ? (f.documentos ?? []) : [],
  ...("cedula" in f || "rif" in f || "participaciones" in f
    ? {
        cedula: (f as DetalleApi).cedula,
        rif: (f as DetalleApi).rif,
        ocupacion: (f as DetalleApi).ocupacion,
        tipoEntidad: (f as DetalleApi).tipoEntidad,
        representante: (f as DetalleApi).representante,
        participaciones: (f as DetalleApi).participaciones ?? [],
      }
    : {}),
});

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

type Fallo = "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE";

function comun(e: unknown): Fallo {
  if (e instanceof ErrorApi) {
    if (e.status === 401) return "SIN_SESION";
    if (e.status === 403) return "SIN_PERMISO";
    if (e.status === 404) return "NO_EXISTE";
  }
  throw e;
}

/** Los filtros como los espera la API (`cuenta` es la membresía del panel). */
export function consultaCiudadanos(
  f: FiltrosCiudadanos,
  extra: Record<string, string | number> = {},
) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({
    tipo: f.tipo,
    perfil: f.perfil,
    cuenta: f.membresia,
    baja: f.baja,
    q: f.q,
    sort: f.orden,
  }))
    if (v) p.set(k, v);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
}

/**
 * Una página de ciudadanos, con los conteos por cuenta y cuántas bajas esperan (para el chip
 * «Bajas pedidas», que no depende de los demás filtros).
 */
export async function listarCiudadanosApi(f: FiltrosCiudadanos, pagina = 1, limite = 50) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const [r, bajas] = await Promise.all([
      pedirApi<PaginaApi>(
        `/admin/citizens?${consultaCiudadanos(f, { page: pagina, limit: limite })}`,
        { token: t },
      ),
      pedirApi<PaginaApi>("/admin/citizens?baja=solicitada&limit=1", { token: t }),
    ]);
    return {
      estado: "OK" as const,
      items: r.data.map(ciudadanoDeApi),
      total: r.meta.total,
      pagina: r.meta.page,
      paginas: Math.max(1, r.meta.totalPages),
      conteos: r.meta.conteos,
      bajas: bajas.meta.total,
    };
  } catch (e) {
    return { estado: comun(e) };
  }
}

export async function obtenerCiudadanoApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const d = await pedirApi<DetalleApi>(`/admin/citizens/${encodeURIComponent(id)}`, {
      token: t,
    });
    return { estado: "OK" as const, ciudadano: ciudadanoDeApi(d) };
  } catch (e) {
    // Un id que no es UUID es un 400: tampoco existe.
    if (e instanceof ErrorApi && e.status === 400) return { estado: "NO_EXISTE" as const };
    return { estado: comun(e) };
  }
}

/** Suspende (con motivo) o reactiva (motivo opcional). Cierra sus sesiones y le avisa. */
export async function cuentaApi(
  id: string,
  estado: "ACTIVA" | "SUSPENDIDA",
  motivo?: string,
): Promise<{ estado: "OK" | Fallo | "SIN_MOTIVO" | "ANONIMIZADA" }> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    await pedirApi(`/admin/citizens/${encodeURIComponent(id)}/status`, {
      token: t,
      metodo: "PATCH",
      cuerpo: { estado, ...(motivo?.trim() ? { motivo: motivo.trim() } : {}) },
    });
    return { estado: "OK" };
  } catch (e) {
    if (e instanceof ErrorApi) {
      if (e.code === "VALIDATION_ERROR") return { estado: "SIN_MOTIVO" };
      if (e.status === 409) return { estado: "ANONIMIZADA" };
    }
    return { estado: comun(e) };
  }
}

/** Atiende la baja: anonimiza la cuenta. Solo si la pidió (si no, 422 INVALID_TRANSITION). */
export async function anonimizarApi(
  id: string,
): Promise<{ estado: "OK" | Fallo | "SIN_BAJA" | "ANONIMIZADA" }> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    await pedirApi(`/admin/citizens/${encodeURIComponent(id)}/deletion`, {
      token: t,
      metodo: "PATCH",
      cuerpo: { accion: "ANONIMIZAR" },
    });
    return { estado: "OK" };
  } catch (e) {
    if (e instanceof ErrorApi) {
      if (e.code === "INVALID_TRANSITION") return { estado: "SIN_BAJA" };
      if (e.status === 409) return { estado: "ANONIMIZADA" };
    }
    return { estado: comun(e) };
  }
}

/** URL firmada (5 minutos) de un documento del ciudadano. Cada consulta queda en la bitácora. */
export async function urlDocumentoCiudadanoApi(id: string, docId: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const r = await pedirApi<{ url: string; expiraEl: string }>(
      `/admin/citizens/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/url`,
      { token: t },
    );
    return { estado: "OK" as const, url: r.url };
  } catch (e) {
    return { estado: comun(e) };
  }
}

/** El CSV de la API (ya enmascarado). La exportación queda en la bitácora. */
export async function exportarCiudadanosApi(f: FiltrosCiudadanos) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const csv = await pedirApi<string>(`/admin/citizens/export.csv?${consultaCiudadanos(f)}`, {
      token: t,
      crudo: true,
    });
    return { estado: "OK" as const, csv: conBom(csv) };
  } catch (e) {
    return { estado: comun(e) };
  }
}
