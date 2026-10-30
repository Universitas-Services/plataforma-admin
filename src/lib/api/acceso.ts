import "server-only";
import { ErrorApi, pedirApi, type SesionApi } from "./cliente";
import type { RolAlcaldia } from "@/lib/plataforma/tipos";

/*
 * Acceso del personal contra plataforma-api (guía R13 §1): recuperar la contraseña, restablecerla
 * e invitaciones. Son públicas (sin sesión) y van sin x-client-id, como el login del panel.
 * Devuelven los mismos estados que la simulación de servicio.ts, así las páginas no cambian.
 */

export type EstadoEnlaceApi = "OK" | "VENCIDO" | "USADO" | "INVALIDO";

/** Respuesta neutra: la API responde 204 exista o no la cuenta. */
export async function recuperarApi(correo: string) {
  await pedirApi("/auth/forgot", { cuerpo: { email: correo } });
}

export async function estadoRestablecerApi(token: string): Promise<EstadoEnlaceApi> {
  if (!token) return "INVALIDO";
  const r = await pedirApi<{ estado: EstadoEnlaceApi }>("/auth/reset/estado", {
    cuerpo: { token },
  });
  return r.estado;
}

/** Guarda la contraseña nueva (cierra todas las sesiones). Un enlace que no sirve dice por qué. */
export async function restablecerApi(token: string, contrasena: string): Promise<EstadoEnlaceApi> {
  try {
    await pedirApi("/auth/reset", { cuerpo: { token, password: contrasena } });
    return "OK";
  } catch (e) {
    if (e instanceof ErrorApi && e.code === "INVALID_TOKEN") {
      const estado = (e.details as { estado?: EstadoEnlaceApi } | undefined)?.estado;
      return estado && estado !== "OK" ? estado : "INVALIDO";
    }
    throw e;
  }
}

type EstadoInvitacionApi = "VALIDA" | "VENCIDA" | "USADA" | "INVALIDA" | "REEMPLAZADA";

/** Los estados de la API con los nombres del panel. */
const ESTADO_INVITACION = {
  VALIDA: "OK",
  VENCIDA: "VENCIDO",
  USADA: "USADO",
  INVALIDA: "INVALIDO",
  REEMPLAZADA: "REEMPLAZADA",
} as const;

export async function verInvitacionApi(token: string) {
  if (!token) return { estado: "INVALIDO" as const };
  try {
    const r = await pedirApi<{
      estado: EstadoInvitacionApi;
      email?: string;
      roles?: string[];
      alcaldia?: { codigo: string; nombre: string };
    }>(`/auth/invitations/${encodeURIComponent(token)}`);
    return {
      estado: ESTADO_INVITACION[r.estado] ?? ("INVALIDO" as const),
      correo: r.email ?? "",
      alcaldia: r.alcaldia?.nombre,
      roles: (r.roles ?? []).filter((x): x is RolAlcaldia =>
        ["ADMIN", "OPERADOR", "REVISOR"].includes(x),
      ),
      rolPlataforma: undefined,
    };
  } catch (e) {
    if (e instanceof ErrorApi && (e.status === 404 || e.status === 400))
      return { estado: "INVALIDO" as const };
    throw e;
  }
}

/** Acepta la invitación: la API responde con la sesión, igual que el login. */
export async function aceptarInvitacionApi(
  token: string,
  d: { cedula: string; nombres: string; apellidos: string; contrasena: string },
): Promise<
  { estado: "OK"; sesion: SesionApi } | { estado: "CEDULA_EN_USO" } | { estado: "INVALIDA" }
> {
  try {
    const sesion = await pedirApi<SesionApi>("/auth/invitations/accept", {
      cuerpo: {
        token,
        cedula: d.cedula,
        nombres: d.nombres,
        apellidos: d.apellidos,
        password: d.contrasena,
      },
    });
    return { estado: "OK", sesion };
  } catch (e) {
    if (e instanceof ErrorApi) {
      if (e.code === "IDENTITY_CONFLICT") return { estado: "CEDULA_EN_USO" };
      if (e.code === "INVALID_TOKEN" || e.status === 404 || e.status === 410)
        return { estado: "INVALIDA" };
    }
    throw e;
  }
}

/** Pide otro enlace: la API responde 204 siempre (neutro). */
export async function reenviarInvitacionPublicaApi(token: string) {
  await pedirApi("/auth/invitations/resend", { cuerpo: { token } });
}
