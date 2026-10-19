import type { Banner, Documento, Medio, Noticia } from "@/lib/contenido/tipos";

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
  /**
   * Epoch ms desde el que valen sus sesiones: «cerrar todas», cambiar o restablecer la
   * contraseña invalidan los tokens firmados antes de esta marca.
   */
  sesionesDesde?: number;
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

/* ---------- Participaciones (backlog 2.10; misma forma que el portal) ---------- */

export const ESTADOS_PARTICIPACION = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "PUBLICADA",
] as const;
export type EstadoParticipacion = (typeof ESTADOS_PARTICIPACION)[number];

export const TIPOS_PARTICIPACION = {
  OPINION_GENERAL: "Opinión general",
  OPINION_NOTICIA: "Opinión sobre noticia",
  PROPUESTA_FORMAL: "Propuesta formal",
} as const;
export type TipoParticipacion = keyof typeof TIPOS_PARTICIPACION;

/** Motivos de rechazo (catálogo propuesto; se confirma con el cliente y con backend). */
export const MOTIVOS_RECHAZO = {
  IDENTIDAD_NO_ACREDITADA: "Identidad no acreditada",
  FUERA_DE_ALCANCE: "Fuera del alcance del PDUL",
  INFORMACION_INSUFICIENTE: "Información insuficiente",
  DUPLICADA: "Aporte duplicado",
  LENGUAJE_INAPROPIADO: "Lenguaje inapropiado",
  OTRO: "Otro motivo",
} as const;
export type MotivoRechazo = keyof typeof MOTIVOS_RECHAZO;

export type ArchivoAporte = {
  nombre: string;
  mime: string;
  tamano: number;
  /** Solo en los datos de ejemplo con archivo público; con la API, URL firmada. */
  url?: string;
  credito?: string;
};

export type DocumentoAutor = {
  tipo: "IDENTIDAD" | "REPRESENTACION" | "ENTIDAD";
  nombre: string;
  version: number;
};

/** Instantánea del perfil del autor al momento de enviar el aporte. */
export type AutorAporte = {
  tipo: "NATURAL" | "ORGANIZACION";
  nombre: string;
  correo: string;
  cedula?: string;
  telefono?: string;
  ocupacion?: string;
  rif?: string;
  tipoEntidad?: string;
  representante?: { nombre: string; cedula: string; condicion: string };
  documentos: DocumentoAutor[];
};

export type PasoParticipacion = {
  estado: EstadoParticipacion;
  fecha: string;
  /** Id del usuario interno; sin él, el sistema (recepción). */
  por?: string;
  /** Lo que lee el ciudadano (comentario o motivo del rechazo). */
  comentario?: string;
  motivo?: MotivoRechazo;
};

export type Participacion = {
  folio: string;
  alcaldiaId: string;
  tipo: TipoParticipacion;
  noticia?: { slug: string; titulo: string };
  parroquia: string;
  sector: string;
  categoriaTecnica: string;
  descripcion: string;
  imagenes: ArchivoAporte[];
  video?: { fuente: "YOUTUBE" | "INSTAGRAM"; url: string };
  soporte?: ArchivoAporte;
  mostrarNombre: boolean;
  autor: AutorAporte;
  estado: EstadoParticipacion;
  recibidaEl: string;
  historial: PasoParticipacion[];
  /** Cotejo de identidad del Revisor al evaluar el aporte (verificación por aporte). */
  identidad?: {
    resultado: "CONFIRMADA" | "NO_CONFIRMADA";
    nota?: string;
    por: string;
    fecha: string;
  };
  /** Notas internas: no las ve el ciudadano. */
  notas: { id: string; por: string; texto: string; fecha: string }[];
  ejemplo?: boolean;
};

/** Fila de la bandeja y del tablero, calculada desde la participación. */
export type ParticipacionDemo = {
  folio: string;
  tipo: string;
  autor: string;
  parroquia: string;
  categoriaTecnica: string;
  /** Días desde que entró en su estado actual. */
  dias: number;
  recibida: string;
  estado: EstadoParticipacion;
};

/* ---------- Capa de alcaldía: ciudadanos, catálogos y proceso (backlog 2.11 y 2.12) ---------- */

/** Persona u organización registrada en el portal de una alcaldía (vista de la alcaldía). */
export type Ciudadano = {
  id: string;
  alcaldiaId: string;
  tipo: "NATURAL" | "ORGANIZACION";
  nombre: string;
  correo: string;
  cedula?: string;
  rif?: string;
  tipoEntidad?: string;
  telefono?: string;
  ocupacion?: string;
  representante?: { nombre: string; cedula: string; condicion: string };
  perfilCompleto: boolean;
  documentos: DocumentoAutor[];
  membresia: { estado: "ACTIVA" | "SUSPENDIDA"; desde: string; motivo?: string };
  registradoEl: string;
  ejemplo?: boolean;
};

export const TIPOS_CATALOGO = {
  parroquias: "Parroquias",
  categoriasTecnicas: "Categorías técnicas",
  categoriasNoticias: "Categorías de noticias",
  categoriasDocumentos: "Categorías de documentos",
  ocupaciones: "Ocupaciones",
  tiposOrganizacion: "Tipos de organización",
} as const;
export type TipoCatalogo = keyof typeof TIPOS_CATALOGO;

export type ItemCatalogo = { id: string; nombre: string; activo: boolean };

export type FaseProceso = {
  id: string;
  nombre: string;
  descripcion: string;
  /** Fechas AAAA-MM-DD, opcionales. */
  inicio?: string;
  fin?: string;
};

/** Fases del proceso PDUL de una alcaldía y la fase en curso (el termómetro del portal). */
export type Proceso = { fases: FaseProceso[]; actual: number };

export type Almacen = {
  usuarios: Map<string, UsuarioInterno>;
  alcaldias: Map<string, Alcaldia>;
  tokens: Map<string, Token>;
  sesiones: Map<string, Sesion>;
  bitacora: EventoBitacora[];
  /** Bytes de los logos por alcaldía: `${alcaldiaId}` (vigente) y `${alcaldiaId}:borrador`. */
  logos: Map<string, Uint8Array>;
  /** Participaciones de todas las alcaldías, por folio (backlog 1.16). */
  participaciones: Map<string, Participacion>;
  /** Noticias e información de todas las alcaldías (backlog 1.13). */
  noticias: Map<string, Noticia>;
  /** Archivos subidos desde el editor: imágenes, PDF, videos y subtítulos. */
  medios: Map<string, Medio>;
  /** Banners del carrusel del Inicio (backlog 1.14). */
  banners: Map<string, Banner>;
  /** Repositorio de documentos (backlog 1.15). */
  documentos: Map<string, Documento>;
  /** Ciudadanos registrados en el portal de cada alcaldía (backlog 1.12). */
  ciudadanos: Map<string, Ciudadano>;
  /** Catálogos de cada alcaldía (backlog 1.9). */
  catalogos: Map<string, Record<TipoCatalogo, ItemCatalogo[]>>;
  /** Fases del proceso de cada alcaldía (backlog 1.9). */
  procesos: Map<string, Proceso>;
};
