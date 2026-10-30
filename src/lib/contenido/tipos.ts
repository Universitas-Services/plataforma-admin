/*
 * Contenido que publica el Operador (backlog 1.13 y 2.9). Las formas siguen las que lee el
 * portal ciudadano (portal-iribarren/src/lib/api/types.ts) para que el admin produzca
 * exactamente lo que el portal muestra.
 */

export type Credito = { autor: string; licencia: string; fuente: string };

export type Imagen = {
  src: string;
  alt: string;
  ancho: number;
  alto: number;
  /** Autor y licencia; obligatorio cuando la imagen no es propia de la Alcaldía. */
  credito?: Credito;
  /** Foto de archivo que no corresponde al hecho narrado; se rotula «Foto ilustrativa». */
  ilustrativa?: boolean;
};

export type Adjunto = {
  nombre: string;
  url: string;
  tipo: "application/pdf";
  pesoBytes: number;
  paginas?: number;
};

export const FUENTES_VIDEO = ["ARCHIVO", "YOUTUBE", "INSTAGRAM"] as const;
export type FuenteVideo = (typeof FUENTES_VIDEO)[number];

export type Video = {
  fuente: FuenteVideo;
  /** URL del archivo subido, o el enlace normalizado de YouTube o Instagram. */
  url: string;
  portada?: Imagen;
  duracionSeg?: number;
  /** Subtítulos en WebVTT. */
  subtitulos?: string;
};

/** Los cinco formatos del portal: solo texto, una imagen, galería, documento o video. */
export const FORMATOS = ["TEXTO", "IMAGEN", "GALERIA", "DOCUMENTO", "VIDEO"] as const;
export type Formato = (typeof FORMATOS)[number];

export const NOMBRE_FORMATO: Record<Formato, string> = {
  TEXTO: "Texto",
  IMAGEN: "Imagen",
  GALERIA: "Galería",
  DOCUMENTO: "Documento",
  VIDEO: "Video",
};

export const TIPOS_NOTICIA = ["NOTICIA", "INFORMACION"] as const;
export type TipoNoticia = (typeof TIPOS_NOTICIA)[number];

export const NOMBRE_TIPO: Record<TipoNoticia, string> = {
  NOTICIA: "Noticia",
  INFORMACION: "Información",
};

/** Categorías de la Propuesta v4, las mismas del portal. */
export const CATEGORIAS = [
  "Análisis institucional",
  "Doctrina legal",
  "Decretos y normativas",
  "Normativa",
  "Mensaje institucional",
  "Auditoría y diagnóstico",
  "Mesas de trabajo",
  "Despliegue territorial",
  "Visión de futuro",
] as const;
/** Un valor del catálogo «Categorías de noticias» (editable en Configuración, R16). */
export type Categoria = string;

export const ESTADOS_NOTICIA = ["BORRADOR", "PROGRAMADO", "PUBLICADO", "DESPUBLICADO"] as const;
export type EstadoNoticia = (typeof ESTADOS_NOTICIA)[number];

export const NOMBRE_ESTADO: Record<EstadoNoticia, string> = {
  BORRADOR: "Borrador",
  PROGRAMADO: "Programada",
  PUBLICADO: "Publicada",
  DESPUBLICADO: "Despublicada",
};

export type PuntosAnalisis = {
  titulo?: string;
  items: { titulo: string; texto: string }[];
};

export type Noticia = {
  id: string;
  alcaldiaId: string;
  /** Único dentro de la alcaldía; lo genera el servidor a partir del título. */
  slug: string;
  tipo: TipoNoticia;
  formato: Formato;
  titulo: string;
  resumen: string;
  categoria?: Categoria;
  parroquia?: string;
  portada?: Imagen;
  /** HTML del editor, ya saneado. */
  cuerpo: string;
  /** Imágenes de la galería. */
  imagenes: Imagen[];
  adjunto?: Adjunto;
  video?: Video;
  puntos?: PuntosAnalisis;
  boton?: { texto: string; href: string };
  /** «Destacada en portada»: el Inicio del portal la muestra antes que las demás. */
  destacada: boolean;
  estado: EstadoNoticia;
  /** Fecha ISO en que se publicará (PROGRAMADO). */
  publicarEl?: string;
  /** Fecha ISO de la publicación (PUBLICADO o DESPUBLICADO). */
  publicadoEl?: string;
  autorId: string;
  creadoEl: string;
  actualizadoEl: string;
  /** Borrado lógico (solo borradores). */
  eliminadaEl?: string;
  /** Contenido de demostración: el portal lo rotula «Ejemplo». */
  ejemplo?: boolean;
};

/** Lo que se edita desde el formulario; el resto lo maneja el servidor. */
export type CamposNoticia = Pick<
  Noticia,
  | "tipo"
  | "formato"
  | "titulo"
  | "resumen"
  | "categoria"
  | "parroquia"
  | "portada"
  | "cuerpo"
  | "imagenes"
  | "adjunto"
  | "video"
  | "puntos"
  | "boton"
  | "destacada"
>;

/* ---------- Medios subidos ---------- */

export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;
export const TIPOS_MEDIO = [
  ...TIPOS_IMAGEN,
  "application/pdf",
  "video/mp4",
  "video/webm",
  "text/vtt",
] as const;
export type TipoMedio = (typeof TIPOS_MEDIO)[number];

export const CLASES_MEDIO = ["imagen", "pdf", "video", "subtitulos"] as const;
export type ClaseMedio = (typeof CLASES_MEDIO)[number];

const MB = 1024 * 1024;

/**
 * Límites por clase, los mismos de plataforma-api (guía R6): imagen 5 MB, PDF 20 MB, video
 * 30 MB (Cloud Run no acepta peticiones de más de 32 MiB; para más, YouTube o Instagram) y
 * subtítulos 200 KB.
 */
export const LIMITES_MEDIO: Record<ClaseMedio, { tipos: readonly TipoMedio[]; max: number }> = {
  imagen: { tipos: TIPOS_IMAGEN, max: 5 * MB },
  pdf: { tipos: ["application/pdf"], max: 20 * MB },
  video: { tipos: ["video/mp4", "video/webm"], max: 30 * MB },
  subtitulos: { tipos: ["text/vtt"], max: 200 * 1024 },
};

export type Medio = {
  id: string;
  alcaldiaId: string;
  tipo: TipoMedio;
  nombre: string;
  bytes: Uint8Array;
  subidoEl: string;
};

export const urlMedio = (id: string) => `/medios/${id}`;

/* ---------- Diapositivas de la tarjeta de transiciones del Inicio ---------- */

/** Tonos del portal: «rojo» es el color de marca de la alcaldía; «tinta», oscuro; «cálido», claro. */
export const TONOS_BANNER = ["rojo", "tinta", "calido"] as const;
export type TonoBanner = (typeof TONOS_BANNER)[number];

export const NOMBRE_TONO: Record<TonoBanner, string> = {
  rojo: "Color de la alcaldía",
  tinta: "Oscuro",
  calido: "Claro cálido",
};

export type Banner = {
  id: string;
  alcaldiaId: string;
  titulo: string;
  texto: string;
  enlace: { href: string; etiqueta: string };
  tono: TonoBanner;
  imagen?: Imagen;
  /** Posición en el carrusel, de menor a mayor. */
  orden: number;
  /** Días «AAAA-MM-DD» (hora de Venezuela), ambos incluidos; sin uno, no hay ese límite. */
  vigencia?: { desde?: string; hasta?: string };
  creadoEl: string;
  actualizadoEl: string;
  eliminadoEl?: string;
  ejemplo?: boolean;
};

export type CamposBanner = Pick<
  Banner,
  "titulo" | "texto" | "enlace" | "tono" | "imagen" | "vigencia"
>;

export const VIGENCIAS = ["VIGENTE", "FUTURO", "VENCIDO"] as const;
export type Vigencia = (typeof VIGENCIAS)[number];

/* ---------- Repositorio de documentos (backlog 1.15) ---------- */

export const DOC_CATEGORIAS = [
  "Decretos y normativa",
  "Plan de trabajo",
  "Informes técnicos",
  "Cartografía",
  "Minutas",
] as const;
/** Un valor del catálogo «Categorías de documentos» (editable en Configuración, R16). */
export type DocCategoria = string;

/** Borrador de trabajo o documento oficializado (lo dice el portal junto al documento). */
export const DOC_ESTADOS = ["BORRADOR", "OFICIAL"] as const;
export type DocEstado = (typeof DOC_ESTADOS)[number];

export const NOMBRE_DOC_ESTADO: Record<DocEstado, string> = {
  BORRADOR: "Borrador de trabajo",
  OFICIAL: "Oficial",
};

export type VersionDocumento = {
  version: string;
  fecha: string;
  nota: string;
  /** El PDF de esa versión (el portal solo muestra el de la vigente). */
  archivo: Adjunto;
};

export type Documento = {
  id: string;
  alcaldiaId: string;
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: DocCategoria;
  estado: DocEstado;
  /** Visible en el portal; oculto, solo lo ve el equipo. */
  publico: boolean;
  /** Versión vigente, p. ej. «1.2». */
  version: string;
  archivo: Adjunto;
  /** De la más reciente a la más antigua; la primera es la vigente. */
  versiones: VersionDocumento[];
  publicadoEl: string;
  actualizadoEl: string;
  eliminadoEl?: string;
  ejemplo?: boolean;
  /** Descargas contadas por plataforma-api (R8); sin la API salen de las métricas simuladas. */
  descargas?: number;
};

export type CamposDocumento = Pick<
  Documento,
  "titulo" | "descripcion" | "categoria" | "estado" | "publico"
>;
