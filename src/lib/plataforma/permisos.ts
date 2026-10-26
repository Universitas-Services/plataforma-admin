import type { RolAlcaldia, UsuarioInterno } from "./tipos";

/*
 * Permisos del panel de la alcaldía (backlog de refactorización 1.3). El menú, las rutas y las
 * acciones salen de aquí, y el servidor los vuelve a comprobar en cada página y en cada acción.
 */

export const PERMISOS = [
  "tablero.ver",
  "metricas.participacion",
  "metricas.contenido",
  "metricas.ciudadania",
  "metricas.equipo",
  "equipo.gestionar",
  "configuracion.ver",
  "contenido.editar",
  "inicio.editar",
  "proceso.editar",
  "participaciones.evaluar",
  "ciudadanos.ver",
  "ciudadanos.suspender",
  "bitacora.ver",
] as const;

export type Permiso = (typeof PERMISOS)[number];

const DE_ROL: Record<RolAlcaldia, readonly Permiso[]> = {
  // El administrador tiene todo lo del Operador y del Revisor (RN-13).
  ADMIN: PERMISOS,
  OPERADOR: [
    "tablero.ver",
    "metricas.contenido",
    "contenido.editar",
    "inicio.editar",
    "proceso.editar",
  ],
  REVISOR: [
    "tablero.ver",
    "metricas.participacion",
    "metricas.ciudadania",
    "participaciones.evaluar",
    "ciudadanos.ver",
  ],
};

/** Roles efectivos del personal (el Super Admin no tiene roles: tiene todos los permisos). */
export function rolesDe(u: UsuarioInterno): RolAlcaldia[] {
  return u.activo ? [...u.roles] : [];
}

/** Permisos efectivos: el Super Admin tiene todos; el personal, los de sus roles. */
export function permisosDe(u: UsuarioInterno): Set<Permiso> {
  if (u.rolPlataforma === "SUPER_ADMIN") return new Set(PERMISOS);
  const s = new Set<Permiso>();
  for (const r of rolesDe(u)) for (const p of DE_ROL[r]) s.add(p);
  return s;
}

export const puede = (u: UsuarioInterno, permiso: Permiso) => permisosDe(u).has(permiso);

export type Seccion = {
  href: string;
  etiqueta: string;
  permiso: Permiso;
};

/** Estaciones de la línea (sidebar), en orden. */
export const SECCIONES: Seccion[] = [
  { href: "/tablero", etiqueta: "Tablero", permiso: "tablero.ver" },
  { href: "/participaciones", etiqueta: "Participaciones", permiso: "participaciones.evaluar" },
  { href: "/contenido", etiqueta: "Contenido", permiso: "contenido.editar" },
  { href: "/ciudadanos", etiqueta: "Ciudadanos", permiso: "ciudadanos.ver" },
  { href: "/equipo", etiqueta: "Equipo", permiso: "equipo.gestionar" },
  { href: "/configuracion", etiqueta: "Configuración", permiso: "configuracion.ver" },
  { href: "/bitacora", etiqueta: "Bitácora", permiso: "bitacora.ver" },
];

/** Las estaciones que ve un usuario según sus permisos. */
export function seccionesDe(u: UsuarioInterno): Seccion[] {
  const permisos = permisosDe(u);
  return SECCIONES.filter((s) => permisos.has(s.permiso));
}

/** Permiso que exige cada ruta: la sección más específica que la contiene. */
export function permisoDeRuta(ruta: string): Seccion | undefined {
  return [...SECCIONES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => ruta === s.href || ruta.startsWith(`${s.href}/`));
}
