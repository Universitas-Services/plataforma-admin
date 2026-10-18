import type { RolAlcaldia, RolPlataforma, UsuarioInterno } from "./tipos";

/*
 * Permisos del panel (backlog 1.5 y RN-12/13). El menú, las rutas y las acciones salen de
 * aquí, y el servidor los vuelve a comprobar en cada página y en cada acción.
 */

export const PERMISOS_PLATAFORMA = [
  "plataforma.ver",
  "alcaldias.gestionar",
  "bitacora.global",
  /** Solo Super Admin: Representantes, integraciones y configuración global. */
  "plataforma.reservado",
] as const;

export const PERMISOS_ALCALDIA = [
  "tablero.ver",
  "marca.configurar",
  "equipo.gestionar",
  "catalogos.gestionar",
  "contenido.editar",
  "participaciones.evaluar",
  "ciudadanos.ver",
  "ciudadanos.suspender",
  "bitacora.ver",
] as const;

export type PermisoPlataforma = (typeof PERMISOS_PLATAFORMA)[number];
export type PermisoAlcaldia = (typeof PERMISOS_ALCALDIA)[number];
export type Permiso = PermisoPlataforma | PermisoAlcaldia;

const DE_PLATAFORMA: Record<RolPlataforma, readonly PermisoPlataforma[]> = {
  SUPER_ADMIN: PERMISOS_PLATAFORMA,
  REPRESENTANTE: ["plataforma.ver", "alcaldias.gestionar", "bitacora.global"],
};

const DE_ALCALDIA: Record<RolAlcaldia, readonly PermisoAlcaldia[]> = {
  // El administrador tiene todo lo del Operador y del Revisor (RN-13).
  ADMIN: PERMISOS_ALCALDIA,
  OPERADOR: ["tablero.ver", "contenido.editar"],
  REVISOR: ["tablero.ver", "participaciones.evaluar", "ciudadanos.ver"],
};

/** Roles efectivos dentro de una alcaldía (vacío si no hay membresía activa). */
export function rolesEn(u: UsuarioInterno, alcaldiaId?: string): RolAlcaldia[] {
  if (!alcaldiaId) return [];
  const m = u.membresias.find((x) => x.alcaldiaId === alcaldiaId && x.activa);
  return m ? [...m.roles] : [];
}

/**
 * Permisos efectivos. Los roles de plataforma solo reciben los permisos de alcaldía mientras
 * operan dentro de una (lo que queda en la bitácora al entrar).
 */
export function permisosDe(u: UsuarioInterno, alcaldiaId?: string): Set<Permiso> {
  const s = new Set<Permiso>();
  if (u.rolPlataforma) {
    for (const p of DE_PLATAFORMA[u.rolPlataforma]) s.add(p);
    if (alcaldiaId) for (const p of PERMISOS_ALCALDIA) s.add(p);
  }
  for (const r of rolesEn(u, alcaldiaId)) for (const p of DE_ALCALDIA[r]) s.add(p);
  return s;
}

export const puede = (u: UsuarioInterno, permiso: Permiso, alcaldiaId?: string) =>
  permisosDe(u, alcaldiaId).has(permiso);

export type Seccion = {
  href: string;
  etiqueta: string;
  permiso: Permiso;
  ambito: "plataforma" | "alcaldia";
};

/** Estaciones de la línea (sidebar), en orden. */
export const SECCIONES: Seccion[] = [
  { href: "/plataforma", etiqueta: "Tablero", permiso: "plataforma.ver", ambito: "plataforma" },
  {
    href: "/plataforma/alcaldias",
    etiqueta: "Alcaldías",
    permiso: "alcaldias.gestionar",
    ambito: "plataforma",
  },
  {
    href: "/plataforma/representantes",
    etiqueta: "Representantes",
    permiso: "plataforma.reservado",
    ambito: "plataforma",
  },
  {
    href: "/plataforma/bitacora",
    etiqueta: "Bitácora global",
    permiso: "bitacora.global",
    ambito: "plataforma",
  },
  { href: "/tablero", etiqueta: "Tablero", permiso: "tablero.ver", ambito: "alcaldia" },
  {
    href: "/participaciones",
    etiqueta: "Participaciones",
    permiso: "participaciones.evaluar",
    ambito: "alcaldia",
  },
  { href: "/contenido", etiqueta: "Contenido", permiso: "contenido.editar", ambito: "alcaldia" },
  { href: "/ciudadanos", etiqueta: "Ciudadanos", permiso: "ciudadanos.ver", ambito: "alcaldia" },
  { href: "/equipo", etiqueta: "Equipo", permiso: "equipo.gestionar", ambito: "alcaldia" },
  {
    href: "/configuracion",
    etiqueta: "Configuración",
    permiso: "marca.configurar",
    ambito: "alcaldia",
  },
  { href: "/bitacora", etiqueta: "Bitácora", permiso: "bitacora.ver", ambito: "alcaldia" },
];

/** Las estaciones que ve un usuario: las de plataforma, o las de la alcaldía en la que opera. */
export function seccionesDe(u: UsuarioInterno, alcaldiaId?: string): Seccion[] {
  const permisos = permisosDe(u, alcaldiaId);
  const ambito = alcaldiaId ? "alcaldia" : "plataforma";
  return SECCIONES.filter((s) => s.ambito === ambito && permisos.has(s.permiso));
}

/** Permiso que exige cada ruta: la sección más específica que la contiene. */
export function permisoDeRuta(ruta: string): Seccion | undefined {
  return [...SECCIONES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => ruta === s.href || ruta.startsWith(`${s.href}/`));
}
