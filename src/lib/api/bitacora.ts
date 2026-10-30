import "server-only";
import { conBom, ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import type { FiltrosBitacora } from "@/lib/plataforma/alcaldia";

/*
 * Bitácora contra plataforma-api (guía R13 §4: /admin/audit, permiso bitacora.ver). Los nombres
 * de las acciones vienen de la API (`accionNombre`): los códigos guardados no cambian, y algunos
 * de R2 a R12 están en inglés. La entidad viene en dos partes: la tabla y el id del registro.
 */

export type EventoApi = {
  id: string;
  seq: number;
  fecha: string;
  actor: { id: string; nombre: string; rol: string | null } | null;
  accion: string;
  accionNombre: string;
  entidad: string;
  entidadId: string | null;
  antes?: unknown;
  despues?: unknown;
  ip?: string;
  requestId?: string;
  hashPrevio: string | null;
  hash: string;
};

type PaginaApi = { data: EventoApi[]; meta: { page: number; total: number; totalPages: number } };

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

function comun(e: unknown) {
  if (e instanceof ErrorApi) {
    if (e.status === 401) return "SIN_SESION" as const;
    if (e.status === 403) return "SIN_PERMISO" as const;
    if (e.status === 404 || e.status === 400) return "NO_EXISTE" as const;
  }
  throw e;
}

/** Los filtros como los espera la API: `entidad` es la tabla o el id exacto del registro. */
export function consultaBitacora(f: FiltrosBitacora, extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
}

/** Una página de eventos (lo más reciente primero) con las opciones de los filtros. */
export async function listarBitacoraApi(f: FiltrosBitacora, pagina = 1, limite = 50) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const [r, acciones, actores] = await Promise.all([
      pedirApi<PaginaApi>(`/admin/audit?${consultaBitacora(f, { page: pagina, limit: limite })}`, {
        token: t,
      }),
      pedirApi<{ data: { codigo: string; nombre: string; eventos: number }[] }>(
        "/admin/audit/acciones",
        { token: t },
      ),
      pedirApi<{ data: { id: string; nombre: string; roles: string[] }[] }>(
        "/admin/audit/actores",
        { token: t },
      ),
    ]);
    return {
      estado: "OK" as const,
      eventos: r.data,
      total: r.meta.total,
      pagina: r.meta.page,
      paginas: Math.max(1, r.meta.totalPages),
      acciones: acciones.data,
      actores: actores.data,
    };
  } catch (e) {
    // Un filtro que la API no acepta (actor que no es UUID, acción mal escrita) es un 400.
    if (e instanceof ErrorApi && e.status === 400) return { estado: "FILTRO_INVALIDO" as const };
    return { estado: comun(e) };
  }
}

export async function obtenerEventoApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const e = await pedirApi<EventoApi>(`/admin/audit/${encodeURIComponent(id)}`, { token: t });
    return { estado: "OK" as const, evento: e };
  } catch (e) {
    return { estado: comun(e) };
  }
}

/** Recorre toda la cadena SHA-256. Si se rompe, dice el primer evento que no coincide. */
export async function verificarBitacoraApi() {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const r = await pedirApi<{
      ok: boolean;
      revisados: number;
      primerAlterado?: string;
      primerAlteradoSeq?: number;
    }>("/admin/audit/verify", { token: t, metodo: "POST" });
    return { estado: "OK" as const, ...r };
  } catch (e) {
    return { estado: comun(e) };
  }
}

export async function exportarBitacoraApi(f: FiltrosBitacora) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const csv = await pedirApi<string>(`/admin/audit/export.csv?${consultaBitacora(f)}`, {
      token: t,
      crudo: true,
    });
    return { estado: "OK" as const, csv: conBom(csv) };
  } catch (e) {
    return { estado: comun(e) };
  }
}
