import type { Actores, DatosSitio, Encabezado } from "./sitio";
import type { Banner, Documento, Medio, Noticia } from "@/lib/contenido/tipos";
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
  /** Con la API: id del archivo, para pedir su URL firmada (5 min). */
  id?: string;
  nombre: string;
  mime: string;
  tamano: number;
  /** Huella del archivo (con la API). */
  sha256?: string;
  /** Solo en los datos de ejemplo con archivo público; con la API, URL firmada. */
  url?: string;
  credito?: string;
};

export type DocumentoAutor = {
  /** Con la API: id del documento, para pedir su URL firmada. */
  id?: string;
  tipo: "IDENTIDAD" | "REPRESENTACION" | "ENTIDAD";
  nombre: string;
  version: number;
};

/** Quién hizo algo en el panel: su id y su nombre (como lo devuelve la API). */
export type Actor = { id: string; nombre: string };

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
  /** Quién lo hizo; sin él, el sistema (recepción). */
  por?: Actor;
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
  /** Si al publicarse aparece su nombre; si no, aparece como AUTOR_ANONIMO. */
  mostrarNombre: boolean;
  autor: AutorAporte;
  estado: EstadoParticipacion;
  recibidaEl: string;
  historial: PasoParticipacion[];
  /** Notas internas: no las ve el ciudadano. */
  notas: { id: string; por: Actor; texto: string; fecha: string }[];
  ejemplo?: boolean;
  /* Lo que agrega la API (guía R11). */
  /** Estados a los que puede pasar ahora: habilitan los botones. */
  transiciones?: EstadoParticipacion[];
  publicadaEl?: string;
  /** Huella del contenido y código del acuse: el ciudadano los recibió al enviar. */
  hashContenido?: string;
  codigoVerificacion?: string;
  totales?: { vistas: number; likes: number; dislikes: number };
};

/** Fila de la bandeja y del tablero, calculada desde la participación. */
export type ParticipacionDemo = {
  folio: string;
  /** Para leer («Propuesta formal»). */
  tipo: string;
  /** El valor, para la insignia de estado (una opinión pendiente se ve «Recibida»). */
  tipoClave: TipoParticipacion;
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
  /** Pidió la baja desde el portal: el panel la atiende anonimizando la cuenta. */
  bajaSolicitadaEl?: string;
  /** Cuenta anonimizada: sin datos personales; sus aportes se conservan con su folio. */
  anonimizadoEl?: string;
  /* Con plataforma-api (guía R13). */
  /** Cédula o RIF ya enmascarados («V-12.***.678»), como los da la lista de la API. */
  documento?: string;
  /** Aportes del ciudadano (detalle de la API). */
  participaciones?: {
    folio: string;
    tipo: TipoParticipacion;
    estado: EstadoParticipacion;
    recibidaEl: string;
  }[];
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

/** Nombre de cada catálogo en la URL de plataforma-api (/admin/catalogs/:tipo). */
export const SLUG_CATALOGO: Record<TipoCatalogo, string> = {
  parroquias: "parroquias",
  categoriasTecnicas: "categorias-tecnicas",
  categoriasNoticias: "categorias-noticias",
  categoriasDocumentos: "categorias-documentos",
  ocupaciones: "ocupaciones",
  tiposOrganizacion: "tipos-entidad",
};

export type ItemCatalogo = {
  id: string;
  nombre: string;
  activo: boolean;
  /** Registros vivos que usan el valor (guía R16): participaciones, noticias, perfiles… */
  usos?: number;
};

/**
 * Cómo se ve una fase mientras no le toca (D3, modelo híbrido): las anteriores a la actual se
 * ven «Completado» y la actual «En curso»; las siguientes, lo que fije el Operador.
 */
export const ESTADOS_SIGUIENTE = ["PENDIENTE", "PROXIMAMENTE", "FUTURO"] as const;
export type EstadoSiguiente = (typeof ESTADOS_SIGUIENTE)[number];

export const NOMBRE_ESTADO_FASE = {
  COMPLETADO: "Completado",
  EN_CURSO: "En curso",
  PENDIENTE: "Pendiente",
  PROXIMAMENTE: "Próximamente",
  FUTURO: "Futuro",
} as const;
export type EstadoFase = keyof typeof NOMBRE_ESTADO_FASE;

export type FaseProceso = {
  id: string;
  nombre: string;
  descripcion: string;
  /** Fechas AAAA-MM-DD, opcionales. */
  inicio?: string;
  fin?: string;
  /** Lo que muestra mientras no le toque; por defecto, «Pendiente». */
  estadoSiguiente?: EstadoSiguiente;
};

/** El estado que ve el portal para la fase `i` cuando la actual es `actual`. */
export const estadoDeFase = (f: FaseProceso, i: number, actual: number): EstadoFase =>
  i < actual ? "COMPLETADO" : i === actual ? "EN_CURSO" : (f.estadoSiguiente ?? "PENDIENTE");

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
   * mensaje del alcalde. La tarjeta con transiciones tiene sus diapositivas en `banners`.
   */
  inicio: {
    mensajeAlcalde?: string;
    /** Encabezado y Registro de actores del Inicio (R17); sin guardar, los valores de hoy. */
    encabezado?: Encabezado;
    actores?: Actores;
  };
  /** Datos del sitio (R17): alcalde, contacto, redes y enlaces del pie de página. */
  sitio?: DatosSitio;
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
  /** Diapositivas de la tarjeta de transiciones del Inicio (6 vigentes a la vez). */
  banners: Map<string, Banner>;
  /** Ítems del Marco legal de Conoce el PDUL (anexo de la fase 7, 26-10-2026). */
  marcoLegal: Map<string, ItemMarcoLegal>;
  /** Versiones publicadas de los términos de uso y la política de datos (R15). */
  textosLegales: VersionTextoLegal[];
};

/* ---------- Textos legales del portal (R15) ---------- */

export const TIPOS_TEXTO_LEGAL = ["TERMINOS", "POLITICA_DATOS"] as const;
export type TipoTextoLegal = (typeof TIPOS_TEXTO_LEGAL)[number];

export const TITULO_TEXTO_LEGAL: Record<TipoTextoLegal, string> = {
  TERMINOS: "Términos de uso",
  POLITICA_DATOS: "Política de tratamiento de datos personales",
};

/**
 * Una versión publicada de un texto legal. No se editan: cada cambio es una versión nueva, y al
 * publicarla las personas registradas en el portal deben aceptarla otra vez.
 */
export type VersionTextoLegal = {
  id: string;
  alcaldiaId: string;
  tipo: TipoTextoLegal;
  /** 1, 2, 3… por tipo. La vigente es la de número mayor. */
  version: number;
  /** HTML saneado, del editor de texto (sin imágenes). */
  html: string;
  /** Qué cambió: lo lee el ciudadano al aceptarla. */
  nota: string;
  publicadoPorId: string;
  publicadoEl: string;
};

/* ---------- Marco legal de Conoce el PDUL (anexo de la fase 7) ---------- */

/** A dónde lleva el botón opcional de un ítem: una noticia publicada o un documento público. */
export type DestinoMarco = { tipo: "NOTICIA" | "DOCUMENTO"; id: string };

export type ItemMarcoLegal = {
  id: string;
  alcaldiaId: string;
  titulo: string;
  descripcion: string;
  /** Se muestra en el portal (10 como máximo). */
  activo: boolean;
  /** Posición entre los activos; los inactivos no tienen orden. */
  orden?: number;
  boton?: { texto: string; destino: DestinoMarco };
  creadoEl: string;
  actualizadoEl: string;
  eliminadoEl?: string;
  /** Ítem de ejemplo de la maqueta, no un texto oficial. */
  ejemplo?: boolean;
};

/** Contadores por día (AAAA-MM-DD) de un elemento: vistas, «me gusta» y «no me gusta». */
export type ConteoDia = { vistas: number; likes: number; dislikes: number };
export type Interaccion = { porDia: Record<string, ConteoDia> };

/**
 * Cómo aparece en el portal el autor de un aporte publicado que eligió no mostrar su nombre. La
 * alcaldía puede publicar cualquier aporte; la persona solo decide si aparece su nombre
 * (decisión del cliente, 28-10-2026).
 */
export const AUTOR_ANONIMO = "Ciudadano de Iribarren";
