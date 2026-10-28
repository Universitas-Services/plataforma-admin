import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ErrorApi, pedirApi, type ResumenUsuarioApi, type SesionApi } from "./cliente";
import {
  abrirSello,
  COOKIE_API,
  DURACION_COOKIE_S,
  secretoSesion,
  sellar,
  tokensDeRespuesta,
} from "./sello";
import type { Almacen, RolAlcaldia, UsuarioInterno } from "@/lib/plataforma/tipos";

/*
 * Sesión del panel contra plataforma-api (cuando API_URL está definida). La cookie guarda los
 * tokens cifrados; Proxy los renueva antes de cada página. El usuario se lee de GET /auth/me y
 * se refleja en el almacén del panel (el mismo correo que el seed de la API), así los módulos
 * que la API todavía no ofrece siguen funcionando con sus roles. La API es la autoridad: si un
 * permiso no coincide, responde 403 en /admin/*.
 */

const opciones = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Clave de la sesión en el almacén para una cuenta de la API. */
const claveSesion = (idApi: string) => `api:${idApi}`;

export async function tokensDeCookie() {
  const valor = (await cookies()).get(COOKIE_API)?.value;
  return valor ? abrirSello(valor, secretoSesion()) : null;
}

/** Access token vigente; sin él, a «Iniciar sesión». Para Server Actions y rutas. */
export async function tokenOIngresar(volver = "/tablero") {
  const t = await tokensDeCookie();
  if (!t || t.x <= Date.now()) redirect(`/ingresar?volver=${encodeURIComponent(volver)}`);
  return t.a;
}

/** Guarda en la cookie los tokens de un login, un refresh o un cambio de contraseña. */
export async function guardarTokens(r: SesionApi) {
  (await cookies()).set(COOKIE_API, sellar(tokensDeRespuesta(r), secretoSesion()), {
    ...opciones,
    maxAge: DURACION_COOKIE_S,
  });
}

export async function borrarTokens() {
  (await cookies()).delete(COOKIE_API);
}

const ROLES_ALCALDIA: RolAlcaldia[] = ["ADMIN", "OPERADOR", "REVISOR"];

/**
 * Refleja al usuario de la API en el almacén: el del mismo correo (las cuentas de demostración
 * del seed) o uno nuevo. Los roles y el nombre siempre salen de la API.
 */
export function reflejarUsuario(alm: Almacen, u: ResumenUsuarioApi): UsuarioInterno {
  const correo = u.email.trim().toLowerCase();
  const actual = [...alm.usuarios.values()].find((x) => x.correo === correo);
  const espejo: UsuarioInterno = {
    ...(actual ?? { id: `api-${u.id}`, correo, hash: "", intentosFallidos: 0 }),
    nombres: u.nombres ?? actual?.nombres ?? "",
    apellidos: u.apellidos ?? actual?.apellidos ?? "",
    activo: u.cuenta.estado === "ACTIVA",
    rolPlataforma: u.roles.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : undefined,
    roles: ROLES_ALCALDIA.filter((r) => u.roles.includes(r)),
  };
  alm.usuarios.set(espejo.id, espejo);
  alm.sesiones.set(claveSesion(u.id), { usuarioId: espejo.id });
  return espejo;
}

/** Una sola lectura de /auth/me por petición, aunque varias partes de la página la pidan. */
const yoDeToken = cache(async (token: string) =>
  pedirApi<ResumenUsuarioApi>("/auth/me", { token }),
);

/** Sesión de la cookie: refleja al usuario en el almacén y devuelve su clave. */
export async function idSesionApi(alm: Almacen) {
  const t = await tokensDeCookie();
  if (!t || t.x <= Date.now()) return undefined;
  try {
    const u = await yoDeToken(t.a);
    if (u.context !== "admin" || !u.roles.length) return undefined;
    reflejarUsuario(alm, u);
    return claveSesion(u.id);
  } catch (e) {
    if (e instanceof ErrorApi && (e.status === 401 || e.status === 403)) return undefined;
    throw e;
  }
}
