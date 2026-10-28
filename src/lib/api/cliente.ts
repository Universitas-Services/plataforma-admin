/*
 * Cliente de plataforma-api para el BFF del panel. Solo corre en el servidor (Server Actions,
 * componentes de servidor y Proxy): el navegador nunca ve los tokens. La API se activa
 * definiendo API_URL; sin ella el panel sigue con su simulación de siempre. Las peticiones van
 * sin x-client-id: así la API abre sesiones de personal (contexto «admin»).
 * No importa `server-only` porque Proxy también lo carga.
 */

/** URL base de la API (…/api/v1), sin la barra final, o undefined si no está configurada. */
export const urlApi = () => process.env.API_URL?.replace(/\/+$/, "") || undefined;

/** ¿El panel trabaja contra plataforma-api? Si no, usa el almacén simulado. */
export const usaApi = () => !!urlApi();

/** Formato único de error de la API: { statusCode, code, message, details?, requestId }. */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ErrorApi";
  }
}

type Opciones = {
  metodo?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Objeto que va como JSON, o FormData para subir archivos. */
  cuerpo?: unknown;
  /** Access token de la sesión. */
  token?: string;
};

export async function pedirApi<T>(ruta: string, o: Opciones = {}): Promise<T> {
  const base = urlApi();
  if (!base) throw new ErrorApi(503, "API_NO_CONFIGURADA", "Falta API_URL.");

  const headers = new Headers({ Accept: "application/json" });
  if (o.token) headers.set("Authorization", `Bearer ${o.token}`);
  let body: BodyInit | undefined;
  if (o.cuerpo instanceof FormData) body = o.cuerpo;
  else if (o.cuerpo !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(o.cuerpo);
  }

  let r: Response;
  try {
    r = await fetch(`${base}${ruta}`, {
      method: o.metodo ?? (body ? "POST" : "GET"),
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ErrorApi(503, "API_SIN_RESPUESTA", "No pudimos conectar con el servidor.");
  }

  const texto = await r.text();
  let datos: unknown;
  try {
    datos = texto ? JSON.parse(texto) : undefined;
  } catch {
    datos = undefined;
  }
  if (!r.ok) {
    const e = (datos ?? {}) as Partial<{
      code: string;
      message: string;
      details: unknown;
      requestId: string;
    }>;
    throw new ErrorApi(
      r.status,
      e.code ?? `HTTP_${r.status}`,
      e.message ?? "Error del servidor.",
      e.details,
      e.requestId,
    );
  }
  return datos as T;
}

/* ---------- Respuestas de acceso (guía R2 §1.2) ---------- */

export type RolApi = "SUPER_ADMIN" | "ADMIN" | "OPERADOR" | "REVISOR";

export type ResumenUsuarioApi = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  /** «admin» cuando el login fue sin x-client-id, como el del panel. */
  context: "portal" | "admin";
  roles: RolApi[];
  permisos: string[];
  cuenta: { estado: "ACTIVA" | "SUSPENDIDA"; desde: string | null; motivo: string | null };
  alcaldia: { codigo: string; nombre: string };
};

export type SesionApi = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: ResumenUsuarioApi;
};

/** Renueva los tokens con el refresh token (rota: el anterior deja de valer). */
export const refrescarTokens = (refreshToken: string) =>
  pedirApi<SesionApi>("/auth/refresh", { cuerpo: { refreshToken } });
