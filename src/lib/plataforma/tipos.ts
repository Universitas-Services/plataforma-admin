/*
 * Modelo del panel interno (backlog 1.2, 1.3, 1.5, 1.7, 1.10 y 1.19). Mientras no exista
 * plataforma-api, el panel trabaja contra un almacén en memoria con estas formas.
 */

/** Roles de plataforma: operan sobre todas las alcaldías (rutas /platform/* de la API). */
export const ROLES_PLATAFORMA = ["SUPER_ADMIN", "REPRESENTANTE"] as const;
export type RolPlataforma = (typeof ROLES_PLATAFORMA)[number];

/** Roles dentro de una alcaldía (rutas /admin/*). Operador y Revisor son combinables. */
export const ROLES_ALCALDIA = ["ADMIN", "OPERADOR", "REVISOR"] as const;
export type RolAlcaldia = (typeof ROLES_ALCALDIA)[number];

export const ENTIDADES = ["AVIPRI", "UNIVERSITAS"] as const;
export type Entidad = (typeof ENTIDADES)[number];

export const NOMBRE_ROL: Record<RolPlataforma | RolAlcaldia, string> = {
  SUPER_ADMIN: "Super Admin",
  REPRESENTANTE: "Representante",
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  REVISOR: "Revisor",
};

export const ESTADOS_ALCALDIA = ["ONBOARDING_PENDIENTE", "ACTIVA", "SUSPENDIDA"] as const;
export type EstadoAlcaldia = (typeof ESTADOS_ALCALDIA)[number];

export const TIPOS_LOGO = ["image/png", "image/jpeg", "image/svg+xml"] as const;
export type TipoLogo = (typeof TIPOS_LOGO)[number];

/** Metadatos del logo; los bytes viven aparte (Almacen.logos) y se sirven por su ruta. */
export type LogoAlcaldia = { tipo: TipoLogo; tamano: number; version: number };

/** Capa de marca que configura el administrador en el onboarding (backlog 2.6). */
export type MarcaAlcaldia = {
  /** Color primario en hex (#RRGGBB). */
  primario: string;
  secundario?: string;
  logo?: LogoAlcaldia;
  lema?: string;
};

export type Alcaldia = {
  id: string;
  /** Sigla corta para el rótulo de la línea (IRI, JIM…). */
  sigla: string;
  nombre: string;
  estado: EstadoAlcaldia;
  marca?: MarcaAlcaldia;
  /** Lo que lleva guardado el asistente de onboarding (se confirma al final). */
  borradorMarca?: Partial<MarcaAlcaldia>;
  motivoSuspension?: string;
};

export type Membresia = {
  alcaldiaId: string;
  roles: RolAlcaldia[];
  activa: boolean;
};

export type UsuarioInterno = {
  id: string;
  correo: string;
  /** Vacío mientras la invitación no se acepta. */
  hash: string;
  nombres: string;
  apellidos: string;
  cedula?: string;
  /** Desactivado por un administrador: no puede iniciar sesión. */
  activo: boolean;
  rolPlataforma?: RolPlataforma;
  entidad?: Entidad;
  membresias: Membresia[];
  intentosFallidos: number;
  /** Epoch ms hasta el que la cuenta está bloqueada tras 5 intentos fallidos. */
  bloqueadoHasta?: number;
};

export type TipoToken = "INVITACION" | "RESTABLECER";

export type Token = {
  usuarioId: string;
  tipo: TipoToken;
  expira: number;
  usado: boolean;
};

export type Sesion = {
  usuarioId: string;
  /** Alcaldía en la que opera (la cabecera X-Tenant-Id de la API). */
  alcaldiaId?: string;
};

export type EventoBitacora = {
  id: number;
  fecha: string;
  actorId: string;
  alcaldiaId?: string;
  accion: string;
  entidad: string;
  antes?: unknown;
  despues?: unknown;
  /** Encadenado: el hash del evento anterior y el propio (backlog 1.19). */
  hashPrevio: string;
  hash: string;
};

/** Resumen de participaciones para el tablero, mientras no llegue el bloque 2.10. */
export type ParticipacionDemo = {
  folio: string;
  tipo: "Opinión general" | "Opinión sobre noticia" | "Propuesta formal";
  autor: string;
  parroquia: string;
  categoriaTecnica: string;
  /** Días desde que entró en su estado actual. */
  dias: number;
  recibida: string;
  estado: "PENDIENTE" | "EN_REVISION";
};

export type Almacen = {
  usuarios: Map<string, UsuarioInterno>;
  alcaldias: Map<string, Alcaldia>;
  tokens: Map<string, Token>;
  sesiones: Map<string, Sesion>;
  bitacora: EventoBitacora[];
  /** Bytes de los logos por alcaldía: `${alcaldiaId}` (vigente) y `${alcaldiaId}:borrador`. */
  logos: Map<string, Uint8Array>;
  /** Conteos por estado de cada alcaldía y las pendientes más antiguas (demostración). */
  participaciones: Map<string, { conteos: Record<string, number>; cola: ParticipacionDemo[] }>;
};
