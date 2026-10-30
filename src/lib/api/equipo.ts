import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import type { EstadoMiembro, Miembro } from "@/lib/plataforma/alcaldia";
import type { RolAlcaldia } from "@/lib/plataforma/tipos";

/*
 * Equipo de la alcaldía contra plataforma-api (guía R13 §2: /admin/staff, permiso
 * equipo.gestionar). Devuelve las formas de alcaldia.ts: la API dice INACTIVO donde el panel dice
 * DESACTIVADO, y los errores se traducen a los estados de ResultadoEquipo.
 */

type EstadoApi = "INVITADO" | "ACTIVO" | "INACTIVO";

type FilaApi = {
  id: string;
  nombre: string | null;
  correo: string;
  roles: RolAlcaldia[];
  estado: EstadoApi;
  ultimoAcceso: string | null;
  esYo: boolean;
  invitacion?: { id: string; expiraEl: string; vencida: boolean };
};

type PaginaApi = {
  data: FilaApi[];
  meta: { page: number; totalPages: number; conteos: Record<EstadoApi, number> };
};

const DE_API: Record<EstadoApi, EstadoMiembro> = {
  INVITADO: "INVITADO",
  ACTIVO: "ACTIVO",
  INACTIVO: "DESACTIVADO",
};
const A_API: Record<EstadoMiembro, EstadoApi> = {
  INVITADO: "INVITADO",
  ACTIVO: "ACTIVO",
  DESACTIVADO: "INACTIVO",
};

export const miembroDeApi = (f: FilaApi): Miembro => ({
  id: f.id,
  nombre: f.nombre || f.correo,
  correo: f.correo,
  roles: f.roles,
  estado: DE_API[f.estado] ?? "INVITADO",
  esYo: f.esYo,
  invitacionId: f.invitacion?.id,
  invitacionVencida: f.invitacion?.vencida,
  ultimoAcceso: f.ultimoAcceso ?? undefined,
});

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

export type FalloEquipo =
  | "SIN_SESION"
  | "SIN_PERMISO"
  | "NO_EXISTE"
  | "YA_ES_MIEMBRO"
  | "ES_CIUDADANO"
  | "A_TI_MISMO"
  | "ES_ADMIN"
  | "SIN_ROLES";

/** Errores de la API → los estados del panel. */
function fallo(e: unknown): FalloEquipo {
  if (e instanceof ErrorApi) {
    if (e.code === "YA_ES_MIEMBRO") return "YA_ES_MIEMBRO";
    if (e.code === "IDENTITY_CONFLICT") return "ES_CIUDADANO";
    if (e.code === "A_TI_MISMO") return "A_TI_MISMO";
    if (e.code === "ES_ADMIN") return "ES_ADMIN";
    if (e.code === "VALIDATION_ERROR") return "SIN_ROLES";
    if (e.status === 401) return "SIN_SESION";
    if (e.status === 403) return "SIN_PERMISO";
    if (e.status === 404) return "NO_EXISTE";
  }
  throw e;
}

/** El equipo completo con los filtros (recorre las páginas de 100) y cuántos hay por estado. */
export async function listarEquipoApi(f: {
  rol?: RolAlcaldia;
  estado?: EstadoMiembro;
  q?: string;
}) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  const p = new URLSearchParams({ limit: "100" });
  if (f.rol) p.set("rol", f.rol);
  if (f.estado) p.set("estado", A_API[f.estado]);
  if (f.q) p.set("q", f.q);
  try {
    const miembros: Miembro[] = [];
    let conteos: Record<EstadoMiembro, number> = { ACTIVO: 0, INVITADO: 0, DESACTIVADO: 0 };
    for (let pagina = 1; pagina <= 20; pagina++) {
      p.set("page", String(pagina));
      const r = await pedirApi<PaginaApi>(`/admin/staff?${p}`, { token: t });
      miembros.push(...r.data.map(miembroDeApi));
      const c = r.meta.conteos;
      conteos = { ACTIVO: c.ACTIVO ?? 0, INVITADO: c.INVITADO ?? 0, DESACTIVADO: c.INACTIVO ?? 0 };
      if (pagina >= r.meta.totalPages) break;
    }
    return { estado: "OK" as const, miembros, conteos };
  } catch (e) {
    return { estado: fallo(e) };
  }
}

/** Una escritura del equipo: OK o el fallo traducido. */
async function escribir(ruta: string, metodo: "POST" | "PATCH", cuerpo?: unknown) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi(ruta, { token: t, metodo, cuerpo });
    return { estado: "OK" as const };
  } catch (e) {
    return { estado: fallo(e) };
  }
}

export const invitarApi = (correo: string, roles: string[]) =>
  escribir("/admin/staff/invitations", "POST", { email: correo, roles });

/** Reenvía con el id de la invitación (`fila.invitacion.id`), no el del miembro. */
export const reenviarInvitacionApi = (invitacionId: string) =>
  escribir(`/admin/staff/invitations/${encodeURIComponent(invitacionId)}/resend`, "POST");

export const rolesApi = (id: string, roles: string[]) =>
  escribir(`/admin/staff/${encodeURIComponent(id)}/roles`, "PATCH", { roles });

export const activarApi = (id: string, activo: boolean) =>
  escribir(`/admin/staff/${encodeURIComponent(id)}/status`, "PATCH", { activo });
