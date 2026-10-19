import { HORAS_INVITACION, cifrar, crearAlmacen, registrar } from "./servicio";
import { bannersDemo, documentosDemo, noticiasDemo } from "./fixtures-contenido";
import { catalogosDemo, ciudadanosDemo, procesoDemo } from "./fixtures-alcaldia";
import { participacionesDemo } from "./fixtures-participaciones";
import type { Alcaldia, Almacen, UsuarioInterno } from "./tipos";

/*
 * Datos de demostración del panel (no son reales). Todas las cuentas usan CONTRASENA_DEMO.
 * Cambiar este archivo exige reiniciar `pnpm dev`: el almacén vive en globalThis.
 */

export const CONTRASENA_DEMO = "Plataforma#2026";

const ALCALDIAS: Alcaldia[] = [
  {
    id: "iribarren",
    sigla: "IRI",
    nombre: "Alcaldía del Municipio Iribarren",
    estado: "ACTIVA",
    marca: { primario: "#C32026", secundario: "#232A36", lema: "PDUL YA" },
  },
  {
    id: "jimenez",
    sigla: "JIM",
    nombre: "Alcaldía del Municipio Jiménez",
    estado: "ACTIVA",
    marca: { primario: "#0B6E4F", lema: "Quíbor participa" },
  },
  {
    id: "palavecino",
    sigla: "PAL",
    nombre: "Alcaldía del Municipio Palavecino",
    estado: "ONBOARDING_PENDIENTE",
  },
  // Tres alcaldías pendientes más, una por tamaño de pantalla en las pruebas del asistente.
  {
    id: "crespo",
    sigla: "CRE",
    nombre: "Alcaldía del Municipio Crespo",
    estado: "ONBOARDING_PENDIENTE",
  },
  {
    id: "moran",
    sigla: "MOR",
    nombre: "Alcaldía del Municipio Morán",
    estado: "ONBOARDING_PENDIENTE",
  },
  {
    id: "urdaneta",
    sigla: "URD",
    nombre: "Alcaldía del Municipio Urdaneta",
    estado: "ONBOARDING_PENDIENTE",
  },
  {
    id: "torres",
    sigla: "TOR",
    nombre: "Alcaldía del Municipio Torres",
    estado: "SUSPENDIDA",
    marca: { primario: "#5B3E96" },
    motivoSuspension: "Convenio en renovación (ejemplo).",
  },
];

type Base = Omit<UsuarioInterno, "hash" | "intentosFallidos" | "activo" | "membresias"> &
  Partial<Pick<UsuarioInterno, "activo" | "membresias">> & { sinContrasena?: boolean };

const USUARIOS: Base[] = [
  {
    id: "u-super",
    correo: "superadmin@plataforma.test",
    nombres: "Gabriela",
    apellidos: "Rondón",
    rolPlataforma: "SUPER_ADMIN",
  },
  {
    id: "u-avipri",
    correo: "avipri@plataforma.test",
    nombres: "Héctor",
    apellidos: "Linares",
    rolPlataforma: "REPRESENTANTE",
    entidad: "AVIPRI",
  },
  {
    id: "u-universitas",
    correo: "universitas@plataforma.test",
    nombres: "Daniela",
    apellidos: "Pérez",
    rolPlataforma: "REPRESENTANTE",
    entidad: "UNIVERSITAS",
  },
  {
    id: "u-admin-iri",
    correo: "admin@iribarren.test",
    nombres: "Ramón",
    apellidos: "Escalona",
    membresias: [{ alcaldiaId: "iribarren", roles: ["ADMIN"], activa: true }],
  },
  {
    id: "u-operador-iri",
    correo: "operador@iribarren.test",
    nombres: "Luisa",
    apellidos: "Colmenárez",
    membresias: [{ alcaldiaId: "iribarren", roles: ["OPERADOR"], activa: true }],
  },
  {
    id: "u-revisor-iri",
    correo: "revisor@iribarren.test",
    nombres: "María",
    apellidos: "Fernández",
    membresias: [{ alcaldiaId: "iribarren", roles: ["REVISOR"], activa: true }],
  },
  {
    id: "u-equipo-iri",
    correo: "equipo@iribarren.test",
    nombres: "Andrés",
    apellidos: "Pineda",
    membresias: [{ alcaldiaId: "iribarren", roles: ["OPERADOR", "REVISOR"], activa: true }],
  },
  {
    id: "u-multi",
    correo: "multi@lara.test",
    nombres: "Carolina",
    apellidos: "Mujica",
    membresias: [
      { alcaldiaId: "iribarren", roles: ["REVISOR"], activa: true },
      { alcaldiaId: "jimenez", roles: ["OPERADOR"], activa: true },
    ],
  },
  {
    id: "u-admin-pal",
    correo: "admin@palavecino.test",
    nombres: "Jorge",
    apellidos: "Sequera",
    membresias: [{ alcaldiaId: "palavecino", roles: ["ADMIN"], activa: true }],
  },
  ...(["crespo", "moran", "urdaneta"] as const).map((id) => ({
    id: `u-admin-${id}`,
    correo: `admin@${id}.test`,
    nombres: "Administración",
    apellidos: id[0]!.toUpperCase() + id.slice(1),
    membresias: [{ alcaldiaId: id, roles: ["ADMIN" as const], activa: true }],
  })),
  {
    id: "u-inactivo",
    correo: "desactivado@iribarren.test",
    nombres: "Pedro",
    apellidos: "Álvarez",
    activo: false,
    membresias: [{ alcaldiaId: "iribarren", roles: ["OPERADOR"], activa: false }],
  },
  {
    id: "u-invitado",
    correo: "nuevo.revisor@iribarren.test",
    nombres: "",
    apellidos: "",
    sinContrasena: true,
    activo: false,
    membresias: [{ alcaldiaId: "iribarren", roles: ["REVISOR"], activa: true }],
  },
];

export function almacenDemo(): Almacen {
  const alm = crearAlmacen();
  for (const a of ALCALDIAS) alm.alcaldias.set(a.id, structuredClone(a));
  const hash = cifrar(CONTRASENA_DEMO);
  for (const { sinContrasena, ...u } of USUARIOS)
    alm.usuarios.set(u.id, {
      ...u,
      hash: sinContrasena ? "" : hash,
      activo: u.activo ?? true,
      membresias: structuredClone(u.membresias ?? []),
      intentosFallidos: 0,
    });

  // Invitaciones de ejemplo: válida, vencida y usada.
  const ahora = Date.now();
  alm.tokens.set("demo-invitacion", {
    usuarioId: "u-invitado",
    tipo: "INVITACION",
    expira: ahora + HORAS_INVITACION * 3600_000,
    usado: false,
  });
  alm.tokens.set("demo-invitacion-vencida", {
    usuarioId: "u-invitado",
    tipo: "INVITACION",
    expira: ahora - 1000,
    usado: false,
  });
  alm.tokens.set("demo-invitacion-usada", {
    usuarioId: "u-revisor-iri",
    tipo: "INVITACION",
    expira: ahora + 3600_000,
    usado: true,
  });

  const participaciones = participacionesDemo(ahora);
  for (const p of participaciones) alm.participaciones.set(p.folio, p);
  for (const c of ciudadanosDemo(participaciones, ahora)) alm.ciudadanos.set(c.id, c);
  for (const a of ALCALDIAS) {
    alm.catalogos.set(a.id, catalogosDemo(a.id));
    alm.procesos.set(a.id, procesoDemo());
  }

  for (const n of noticiasDemo(ahora)) alm.noticias.set(n.id, n);
  for (const b of bannersDemo(ahora)) alm.banners.set(b.id, b);
  for (const d of documentosDemo(ahora)) alm.documentos.set(d.id, d);

  registrar(
    alm,
    {
      actorId: "u-super",
      accion: "ALCALDIA_CREADA",
      entidad: "alcaldia",
      alcaldiaId: "palavecino",
    },
    ahora - 86_400_000,
  );
  return alm;
}

/** Solo en desarrollo: devuelve una alcaldía a «onboarding pendiente» (pruebas repetibles). */
export function reiniciarOnboarding(alm: Almacen, id: string) {
  const base = ALCALDIAS.find((a) => a.id === id);
  if (!base || base.estado !== "ONBOARDING_PENDIENTE") return false;
  alm.alcaldias.set(id, structuredClone(base));
  alm.logos.delete(id);
  alm.logos.delete(`${id}:borrador`);
  return true;
}

/** Solo en desarrollo: borra del todo una noticia que creó una prueba E2E. */
export function borrarNoticiaDePrueba(alm: Almacen, id: string) {
  if (id.startsWith("n-ejemplo-")) return false;
  return alm.noticias.delete(id);
}

/** Solo en desarrollo: borra del todo un banner o documento creado por una prueba E2E. */
export function borrarContenidoDePrueba(alm: Almacen, tipo: string, id: string) {
  if (id.includes("-ejemplo-")) return false;
  if (tipo === "banners") return alm.banners.delete(id);
  if (tipo === "documentos") return alm.documentos.delete(id);
  return false;
}
