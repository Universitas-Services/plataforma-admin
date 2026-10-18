import { HORAS_INVITACION, cifrar, crearAlmacen, registrar } from "./servicio";
import type { Alcaldia, Almacen, ParticipacionDemo, UsuarioInterno } from "./tipos";

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

const COLA_IRIBARREN: ParticipacionDemo[] = [
  {
    folio: "IRI-2026-0031",
    tipo: "Propuesta formal",
    autor: "Ana María Pérez",
    parroquia: "Catedral",
    categoriaTecnica: "Vialidad y Transporte",
    dias: 6,
    recibida: "hace 6 días",
    estado: "PENDIENTE",
  },
  {
    folio: "IRI-2026-0033",
    tipo: "Opinión general",
    autor: "José Rodríguez",
    parroquia: "El Cují",
    categoriaTecnica: "Servicios Públicos y Redes",
    dias: 5,
    recibida: "hace 5 días",
    estado: "PENDIENTE",
  },
  {
    folio: "IRI-2026-0036",
    tipo: "Opinión sobre noticia",
    autor: "Consejo Comunal Cardones",
    parroquia: "Juárez",
    categoriaTecnica: "Equipamiento Urbano",
    dias: 4,
    recibida: "hace 4 días",
    estado: "EN_REVISION",
  },
  {
    folio: "IRI-2026-0040",
    tipo: "Propuesta formal",
    autor: "Luis Mendoza",
    parroquia: "Concepción",
    categoriaTecnica: "Zonificación y Uso de Suelo",
    dias: 2,
    recibida: "hace 2 días",
    estado: "PENDIENTE",
  },
  {
    folio: "IRI-2026-0042",
    tipo: "Opinión general",
    autor: "Rosa Gutiérrez",
    parroquia: "Santa Rosa",
    categoriaTecnica: "Medio Ambiente y Riesgos",
    dias: 1,
    recibida: "ayer",
    estado: "EN_REVISION",
  },
  {
    folio: "IRI-2026-0045",
    tipo: "Opinión general",
    autor: "Carla Torres",
    parroquia: "Tamaca",
    categoriaTecnica: "Patrimonio y Renovación Urbana",
    dias: 0,
    recibida: "hoy 9:14",
    estado: "PENDIENTE",
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
      membresias: u.membresias ?? [],
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

  alm.participaciones.set("iribarren", {
    conteos: { PENDIENTE: 12, EN_REVISION: 5, APROBADA: 48, RECHAZADA: 9, PUBLICADA: 31 },
    cola: COLA_IRIBARREN,
  });
  alm.participaciones.set("jimenez", {
    conteos: { PENDIENTE: 3, EN_REVISION: 1, APROBADA: 7, RECHAZADA: 2, PUBLICADA: 4 },
    cola: [],
  });
  alm.participaciones.set("palavecino", {
    conteos: { PENDIENTE: 0, EN_REVISION: 0, APROBADA: 0, RECHAZADA: 0, PUBLICADA: 0 },
    cola: [],
  });

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
