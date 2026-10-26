import type { Documento, Medio, Noticia } from "@/lib/contenido/tipos";
import type { Ubicacion } from "@/lib/ubicacion";

/*
 * Modelo del panel interno (backlog 1.2, 1.3, 1.5, 1.7, 1.10 y 1.19). Mientras no exista
 * plataforma-api, el panel trabaja contra un almacén en memoria con estas formas.
 */

/**
 * Super Admin: cuenta del equipo de la plataforma. Existe en cada panel de alcaldía con todos
 * los permisos (y, aparte, en el registro central). No hay Representantes ni Entidades.
 */
export const ROLES_PLATAFORMA = ["SUPER_ADMIN"] as const;
export type RolPlataforma = (typeof ROLES_PLATAFORMA)[number];

/** Roles del personal de la alcaldía (rutas /admin/*). Operador y Revisor son combinables. */
export const ROLES_ALCALDIA = ["ADMIN", "OPERADOR", "REVISOR"] as const;
export type RolAlcaldia = (typeof ROLES_ALCALDIA)[number];

export const NOMBRE_ROL: Record<RolPlataforma | RolAlcaldia, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  REVISOR: "Revisor",
};

/**
 * La alcaldía de este despliegue (una sola: una API y una base de datos por alcaldía). Sus
 * datos fijos están en src/config/alcaldia.ts; la marca no se configura desde el panel.
 */
export type Alcaldia = {
  id: string;
  sigla: string;
  nombre: string;
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
  /** Roles en la alcaldía; vacío para el Super Admin, que tiene todos los permisos. */
  roles: RolAlcaldia[];
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
  /** Dónde aplica (propuesta formal): punto marcado en el mapa del portal o con Google Maps. */
  ubicacion?: Ubicacion;
  mostrarNombre: boolean;
  autor: AutorAporte;
  estado: EstadoParticipacion;
  recibidaEl: string;
  historial: PasoParticipacion[];
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
  /** Participaciones de todas las alcaldías, por folio (backlog 1.16). */
  participaciones: Map<string, Participacion>;
  /** Noticias e información de todas las alcaldías (backlog 1.13). */
  noticias: Map<string, Noticia>;
  /** Archivos subidos desde el editor: imágenes, PDF, videos y subtítulos. */
  medios: Map<string, Medio>;
  /**
   * Lo que el Inicio del portal muestra elegido por la alcaldía: la noticia de texto del
   * mensaje del alcalde y las noticias de la tarjeta de anuncios, en orden.
   */
  inicio: { mensajeAlcalde?: string; anuncios: string[] };
  /** Vistas y reacciones por elemento: `noticia:<id>` o `aporte:<folio>` (backlog 1.14). */
  interacciones: Map<string, Interaccion>;
  /** Descargas de cada documento (para las métricas). */
  descargas: Map<string, Interaccion>;
  /** Repositorio de documentos (backlog 1.15). */
  documentos: Map<string, Documento>;
  /** Ciudadanos registrados en el portal de cada alcaldía (backlog 1.12). */
  ciudadanos: Map<string, Ciudadano>;
  /** Catálogos de cada alcaldía (backlog 1.9). */
  catalogos: Map<string, Record<TipoCatalogo, ItemCatalogo[]>>;
  /** Fases del proceso de cada alcaldía (backlog 1.9). */
  procesos: Map<string, Proceso>;
};

/** Contadores por día (AAAA-MM-DD) de un elemento: vistas, «me gusta» y «no me gusta». */
export type ConteoDia = { vistas: number; likes: number; dislikes: number };
export type Interaccion = { porDia: Record<string, ConteoDia> };
