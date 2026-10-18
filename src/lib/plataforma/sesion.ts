import "server-only";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { almacenDemo } from "./fixtures";
import { type Permiso } from "./permisos";
import { contextoDe, type Contexto } from "./servicio";
import type { Almacen } from "./tipos";

/*
 * Sesión del panel sobre la API simulada. Con plataforma-api, estas funciones llamarán al BFF
 * y guardarán su token en la misma cookie httpOnly; las pantallas no cambian.
 */

/** Mismo nombre que en src/proxy.ts. */
export const COOKIE_SESION = "pp_sesion";
const COOKIE_AVISO = "pp_aviso";

const global = globalThis as typeof globalThis & { __panelAlmacen?: Almacen };
/** Un solo almacén por proceso, aunque Next recargue los módulos en desarrollo. */
export const almacen = (): Almacen => (global.__panelAlmacen ??= almacenDemo());

export const esDesarrollo = process.env.NODE_ENV !== "production";

const opciones = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !esDesarrollo,
  path: "/",
};

export async function idSesion() {
  return (await cookies()).get(COOKIE_SESION)?.value;
}

export async function getContexto(): Promise<Contexto | null> {
  return contextoDe(almacen(), await idSesion());
}

/** Solo en Server Actions: Next no permite escribir cookies durante el render. */
export async function abrirSesion(sesion: string) {
  (await cookies()).set(COOKIE_SESION, sesion, { ...opciones, maxAge: 60 * 60 * 8 });
}

export async function borrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
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

/**
 * Exige una alcaldía en uso: sin ella, al selector. Con el onboarding pendiente, el
 * administrador va al asistente; el resto del personal espera a que termine.
 */
export async function exigirAlcaldia(volver: string) {
  const c = await exigirSesion(volver);
  if (!c.alcaldia) redirect(c.usuario.rolPlataforma ? "/plataforma" : "/alcaldia");
  if (c.alcaldia.estado === "ONBOARDING_PENDIENTE")
    redirect(
      c.roles.includes("ADMIN") || c.usuario.rolPlataforma
        ? "/onboarding"
        : "/alcaldia?pendiente=1",
    );
  return { ...c, alcaldia: c.alcaldia };
}

/** Exige un permiso; sin él, la página 403 (forbidden). */
export async function exigirPermiso(permiso: Permiso, volver: string) {
  const c = await getContexto();
  if (!c) redirect(`/ingresar?volver=${encodeURIComponent(volver)}`);
  if (!c.permisos.has(permiso)) forbidden();
  return c;
}

/** Pantallas de una alcaldía: exige estar operando en una y el permiso de la sección. */
export async function exigirEnAlcaldia(permiso: Permiso, volver: string) {
  const c = await exigirAlcaldia(volver);
  if (!c.permisos.has(permiso)) forbidden();
  return c;
}

/** Páginas de acceso: con la sesión abierta no se muestran. */
export async function soloInvitados(destino = "/") {
  if (!(await getContexto())) return;
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/");
}
