import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { forbidden, redirect } from "next/navigation";
import { almacenDemo } from "./fixtures";
import { type Permiso } from "./permisos";
import { contextoDe, type Contexto } from "./servicio";
import { DURACION_SESION_MS, firmarSesion, leerSesion } from "./token-sesion";
import type { Almacen } from "./tipos";
import { usaApi } from "@/lib/api/cliente";
import { sincronizarDocumentosApi } from "@/lib/api/documentos";
import { sincronizarNoticiasApi } from "@/lib/api/noticias";
import { borrarTokens, idSesionApi } from "@/lib/api/sesion-api";

/*
 * Sesión del panel. Con plataforma-api (API_URL definida) la cookie guarda sus tokens cifrados
 * (src/lib/api/sesion-api.ts) y el usuario se refleja en el almacén; sin ella, la sesión es la
 * simulada de siempre, firmada por el propio panel. Las pantallas no cambian.
 */

/** Mismo nombre que en src/proxy.ts. */
export const COOKIE_SESION = "pp_sesion";
const COOKIE_AVISO = "pp_aviso";

const global = globalThis as typeof globalThis & { __panelAlmacen?: Almacen };
/** Un solo almacén por proceso, aunque Next recargue los módulos en desarrollo. */
export const almacen = (): Almacen => (global.__panelAlmacen ??= almacenDemo());

export const esDesarrollo = process.env.NODE_ENV !== "production";

/**
 * Modo demostración: en desarrollo siempre; en un despliegue, con DEMO=1. Muestra en pantalla
 * los enlaces que en producción llegarían por correo y la cinta de entorno de demostración.
 * Con plataforma-api los datos son reales: nunca es demostración, aunque quede DEMO=1.
 */
export const esDemo = (esDesarrollo || process.env.DEMO === "1") && !usaApi();

/** Secreto de la firma de sesión. En Netlify: variable SESION_SECRETO. */
function secreto() {
  const s = process.env.SESION_SECRETO;
  if (s) return s;
  if (!esDesarrollo && !avisado) {
    avisado = true;
    console.warn("SESION_SECRETO no está definido: se usa un secreto de demostración.");
  }
  return "pdul-panel-demo-secreto-no-usar-en-produccion";
}
let avisado = false;

const opciones = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !esDesarrollo,
  path: "/",
};

/**
 * Sesión de la cookie, válida en cualquier instancia: si la firma es buena, no venció y no fue
 * revocada, la sesión se registra en la memoria de esta instancia y el servicio la usa como
 * siempre. Así una petición que cae en otra función de Netlify no devuelve al inicio de sesión.
 */
export async function idSesion() {
  if (usaApi()) {
    // Lee la cookie y compara su vencimiento con la hora actual: siempre al pedir la página.
    await connection();
    return idSesionApi(almacen());
  }
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return undefined;
  // El vencimiento se compara con la hora actual: se calcula siempre al pedir la página.
  await connection();
  const alm = almacen();
  const datos = leerSesion(token, secreto());
  if (!datos) {
    alm.sesiones.delete(token);
    return undefined;
  }
  const u = alm.usuarios.get(datos.u);
  if (!u || !u.activo || datos.e < (u.sesionesDesde ?? 0)) {
    alm.sesiones.delete(token);
    return undefined;
  }
  if (!alm.sesiones.has(token)) alm.sesiones.set(token, { usuarioId: datos.u });
  return token;
}

/**
 * Con plataforma-api, refleja en el almacén las noticias publicadas y los documentos de la API
 * antes de usar un módulo simulado que los elige o los cuenta (Inicio, Marco legal, tablero).
 * Sin la API, nada.
 */
export async function contenidoAlDia() {
  if (!usaApi()) return;
  const alm = almacen();
  await Promise.all([sincronizarNoticiasApi(alm), sincronizarDocumentosApi(alm)]);
}

export async function getContexto(): Promise<Contexto | null> {
  return contextoDe(almacen(), await idSesion());
}

async function escribirToken(alm: Almacen, idAnterior: string) {
  const s = alm.sesiones.get(idAnterior);
  if (!s) return;
  const token = firmarSesion(s, secreto());
  alm.sesiones.delete(idAnterior);
  alm.sesiones.set(token, { ...s });
  (await cookies()).set(COOKIE_SESION, token, {
    ...opciones,
    maxAge: DURACION_SESION_MS / 1000,
  });
}

/** Solo en Server Actions: Next no permite escribir cookies durante el render. */
export async function abrirSesion(sesion: string) {
  await escribirToken(almacen(), sesion);
}

/**
 * Vuelve a firmar la sesión actual tras cambiar la contraseña (los tokens anteriores quedaron
 * revocados). Solo en Server Actions.
 */
export async function refrescarSesion(actual?: string) {
  const id = actual ?? (await idSesion());
  if (id) await escribirToken(almacen(), id);
}

export async function borrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
  if (usaApi()) await borrarTokens();
}

/** Aviso de una sola lectura para la pantalla siguiente (p. ej. «Contraseña actualizada»). */
export async function guardarAviso(texto: string) {
  (await cookies()).set(COOKIE_AVISO, texto, { ...opciones, maxAge: 60 });
}

export async function leerAviso() {
  return (await cookies()).get(COOKIE_AVISO)?.value;
}

/* ---------- Protección de rutas (la comprobación real; proxy.ts solo es optimista) ---------- */

/** Exige sesión; sin ella, a «Iniciar sesión» con el regreso indicado. */
export async function exigirSesion(volver: string): Promise<Contexto> {
  const c = await getContexto();
  if (!c) redirect(`/ingresar?volver=${encodeURIComponent(volver)}`);
  return c;
}

/** Exige un permiso; sin él, la página 403 (forbidden). */
export async function exigirPermiso(permiso: Permiso, volver: string) {
  const c = await getContexto();
  if (!c) redirect(`/ingresar?volver=${encodeURIComponent(volver)}`);
  if (!c.permisos.has(permiso)) forbidden();
  return c;
}

/** Pantallas del panel: exige sesión y el permiso de la sección (sin él, 403). */
export const exigirEnAlcaldia = exigirPermiso;

/** Páginas de acceso: con la sesión abierta no se muestran. */
export async function soloInvitados(destino = "/") {
  if (!(await getContexto())) return;
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/");
}
