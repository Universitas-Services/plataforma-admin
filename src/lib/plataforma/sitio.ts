import { z } from "zod";
import { ALCALDIA } from "@/config/alcaldia";
import type { Imagen } from "@/lib/contenido/tipos";
import { contextoDe, registrar } from "./servicio";
import type { Almacen } from "./tipos";

/*
 * Datos del sitio y encabezado del Inicio (R17). Lo que el portal mostraba fijo en el código y
 * la alcaldía quiere cambiar sin un despliegue:
 * - Datos del sitio (Configuración, permiso sitio.editar): alcalde, contacto, redes y enlaces
 *   oficiales del pie de página.
 * - Encabezado y Registro de actores (Contenido → Inicio, permiso inicio.editar).
 * Sin datos guardados se usan los valores de hoy, así el portal nunca queda vacío. Lógica pura:
 * se prueba con Vitest.
 */

/* ---------- Formas (las mismas de la guía R17 para la API) ---------- */

export const REDES = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  X: "X (Twitter)",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
} as const;
export type Red = keyof typeof REDES;

export type DatosSitio = {
  alcalde: { nombre: string; cargo: string; foto?: Imagen };
  contacto: { correo?: string; telefono?: string; direccion: string; horario?: string };
  redes: { red: Red; usuario: string; url: string }[];
  /** Enlaces oficiales del pie de página (marco legal, sitio de la alcaldía…). */
  enlaces: { texto: string; url: string }[];
};

/** Encuadre de una foto del encabezado: dónde queda el motivo, fuera del titular. */
export const POSICIONES = {
  "50% 50%": "Centro",
  "100% 50%": "Derecha",
  "0% 50%": "Izquierda",
  "50% 100%": "Abajo",
  "50% 0%": "Arriba",
} as const;

export type FotoEncabezado = Imagen & { posicion?: string };

export type Encabezado = {
  /** Frase en amarillo antes del título (hoy «Pensando en grande:»). */
  destacado: string;
  titulo: string;
  subtitulo: string;
  fotos: FotoEncabezado[];
};

/** Íconos de los sectores (el portal los dibuja con su set de íconos). */
export const ICONOS_SECTOR = {
  PERSONAS: "Personas",
  CASCO: "Casco (gremios)",
  BIRRETE: "Birrete (academia)",
  FABRICA: "Fábrica (economía)",
  CASA: "Casa (vecinos)",
  EDIFICIO: "Edificio (instituciones)",
} as const;
export type IconoSector = keyof typeof ICONOS_SECTOR;

export type Actores = {
  titulo: string;
  texto: string;
  /** El primero es el principal (la tarjeta grande). */
  sectores: { nombre: string; detalle: string; icono: IconoSector }[];
};

/* ---------- Valores de hoy (lo que el portal mostraba fijo) ---------- */

const CC = (v: string) => `CC BY-SA ${v}`;
const foto = (
  archivo: string,
  alt: string,
  autor: string,
  licencia: string,
  fuente: string,
  posicion?: string,
): FotoEncabezado => ({
  src: `${ALCALDIA.portal}/fotos/${archivo}`,
  alt,
  ancho: 1600,
  alto: 1067,
  credito: { autor, licencia, fuente },
  ...(posicion ? { posicion } : {}),
});

export const SITIO_INICIAL: DatosSitio = {
  alcalde: { nombre: "Yanys Agüero", cargo: "Alcalde de Iribarren" },
  contacto: { direccion: "Palacio Municipal, Barquisimeto" },
  redes: [
    {
      red: "INSTAGRAM",
      usuario: "@alcaldiairibarren",
      url: "https://www.instagram.com/alcaldiairibarren/",
    },
    {
      red: "INSTAGRAM",
      usuario: "@yanysaguerove",
      url: "https://www.instagram.com/yanysaguerove/",
    },
  ],
  enlaces: [
    { texto: "Decreto 48-2026", url: "/conoce-el-pdul#marco-legal" },
    { texto: "LOOU", url: "/conoce-el-pdul#marco-legal" },
    { texto: "Sentencia N° 928/2018 del TSJ", url: "/conoce-el-pdul#marco-legal" },
  ],
};

export const ENCABEZADO_INICIAL: Encabezado = {
  destacado: "Pensando en grande:",
  titulo: "Construyendo el Barquisimeto del futuro, humano y sostenible",
  subtitulo:
    "Planificación urbana participativa para la ciudad humana. Infórmate, opina y propón: el plan se construye con tu voz.",
  fotos: [
    foto(
      "plaza-ayacucho.jpg",
      "Plaza Ayacucho de Barquisimeto, con la estatua ecuestre al fondo de la avenida arbolada",
      "Rodolfo pimentel, Wikimedia Commons",
      CC("4.0"),
      "https://commons.wikimedia.org/wiki/File:Ayacucho1.jpg",
      "50% 55%",
    ),
    foto(
      "catedral-metropolitana.jpg",
      "Catedral Metropolitana de Barquisimeto, con su torre blanca y techo de cristal",
      "Rube96pinto, Wikimedia Commons",
      CC("4.0"),
      "https://commons.wikimedia.org/wiki/File:Santa_Iglesia_Catedral_Metropolitana,_Catedral_de_Barquisimeto.jpg",
    ),
    foto(
      "obelisco.jpg",
      "El Obelisco de Barquisimeto visto de frente bajo el cielo azul",
      "Miguel Ahiezer Salcedo, Wikimedia Commons",
      CC("3.0"),
      "https://commons.wikimedia.org/wiki/File:Obelisco_de_barquisimeto_vista_frontal.jpg",
      "50% 40%",
    ),
    foto(
      "iglesia-el-cristo.jpg",
      "Interior de la Basílica del Santo Cristo de la Gracia, con sus bóvedas y vitrales de colores",
      "Male3285, Wikimedia Commons",
      CC("3.0"),
      "https://commons.wikimedia.org/wiki/File:Iglesia_el_Cristo.jpg",
      "50% 45%",
    ),
    foto(
      "manto-divina-pastora-hero.jpg",
      "Silueta del Monumento Mariano Manto de la Divina Pastora contra un atardecer naranja",
      "José Ocanto, Wikimedia Commons (recorte)",
      CC("4.0"),
      "https://commons.wikimedia.org/wiki/File:Monumento_Manto_1.jpg",
      "50% 100%",
    ),
    foto(
      "flor-de-venezuela.jpg",
      "La Flor de Venezuela, estructura de pétalos metálicos en Barquisimeto",
      "Miguel Ahiezer Salcedo, Wikimedia Commons",
      CC("3.0"),
      "https://commons.wikimedia.org/wiki/File:Flor_de_Venezuela_(Barquisimeto).jpg",
      "50% 50%",
    ),
    foto(
      "estadio-gradas.jpg",
      "Gradas techadas del Estadio Antonio Herrera Gutiérrez con público, bajo un cielo azul con nubes",
      "Rodolfo pimentel, Wikimedia Commons (invertida)",
      CC("4.0"),
      "https://commons.wikimedia.org/wiki/File:LAS_GRADAS.jpg",
      "100% 45%",
    ),
    foto(
      "parque-cardenalito.jpg",
      "La tinaja del Parque El Cardenalito iluminada al anochecer, con la luna creciente",
      "Angel Pérez Santamaria, Wikimedia Commons",
      "CC0 1.0",
      "https://commons.wikimedia.org/wiki/File:Parque_Cardenalito.jpg",
      "70% 60%",
    ),
    foto(
      "iglesia-santa-rosa.jpg",
      "Fachada de la Iglesia de Santa Rosa en Barquisimeto",
      "Jesús David Ríos (Flickr), Wikimedia Commons",
      CC("2.0"),
      "https://commons.wikimedia.org/wiki/File:Iglesia_de_Santa_Rosa_1.jpg",
      "50% 40%",
    ),
    foto(
      "teatro-juares.jpg",
      "Fachada del Teatro Juares en el centro de Barquisimeto",
      "Wilfredor, Wikimedia Commons",
      CC("3.0"),
      "https://commons.wikimedia.org/wiki/File:Teatro_Juares.jpg",
      "50% 50%",
    ),
  ],
};

export const ACTORES_INICIAL: Actores = {
  titulo: "La ciudad que planificamos juntos.",
  texto:
    "El Registro municipal de actores reúne a los cinco sectores convocados por el Decreto 48-2026. Inscríbete como organización o participa como vecino.",
  sectores: [
    {
      nombre: "Poder Popular",
      detalle: "Comunas, consejos comunales, Comités de Tierras Urbanas y mesas técnicas.",
      icono: "PERSONAS",
    },
    {
      nombre: "Gremios técnicos y profesionales",
      detalle: "Ingenieros, arquitectos, abogados y economistas.",
      icono: "CASCO",
    },
    {
      nombre: "Sector académico y científico",
      detalle: "UCLA, UPTAEB, UNEXPO, UFT, UNEFA, UBV y más.",
      icono: "BIRRETE",
    },
    {
      nombre: "Sector económico y productivo",
      detalle: "Cámaras, PyMEs y COMDIBAR.",
      icono: "FABRICA",
    },
    {
      nombre: "Ciudadanía en general",
      detalle: "Vecinas y vecinos domiciliados en Iribarren.",
      icono: "CASA",
    },
  ],
};

/* ---------- Validación ---------- */

export const LIMITES_SITIO = { redes: 6, enlaces: 6, fotos: 12, sectores: 6 } as const;

const texto = (max: number, msj: string) =>
  z.string().trim().min(1, msj).max(max, `Hasta ${max} caracteres.`);
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Hasta ${max} caracteres.`)
    .optional()
    .transform((v) => v || undefined);
/** https://… o una ruta del portal (/…). */
const enlace = z
  .string()
  .trim()
  .regex(/^(https:\/\/\S+|\/(?!\/)\S*)$/, "Escribe un enlace que empiece por https:// o por /.");

const credito = z
  .object({ autor: z.string().trim(), licencia: z.string().trim(), fuente: z.string().trim() })
  .optional();

const imagen = z.object({
  src: z.string().min(1),
  alt: texto(250, "Describe la foto (texto alternativo)."),
  ancho: z.number(),
  alto: z.number(),
  credito,
});

export const sitioSchema = z.object({
  alcalde: z.object({
    nombre: texto(80, "Escribe el nombre."),
    cargo: texto(80, "Escribe el cargo."),
    foto: imagen.optional(),
  }),
  contacto: z.object({
    correo: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined)
      .pipe(z.email("Escribe un correo válido.").optional()),
    telefono: opcional(40),
    direccion: texto(160, "Escribe la dirección."),
    horario: opcional(120),
  }),
  redes: z
    .array(
      z.object({
        red: z.enum(Object.keys(REDES) as [Red, ...Red[]], "Elige la red."),
        usuario: texto(60, "Escribe el usuario."),
        url: z
          .string()
          .trim()
          .regex(/^https:\/\/\S+$/, "Escribe un enlace que empiece por https://."),
      }),
    )
    .max(LIMITES_SITIO.redes, `Hasta ${LIMITES_SITIO.redes} redes.`),
  enlaces: z
    .array(z.object({ texto: texto(60, "Escribe el texto del enlace."), url: enlace }))
    .max(LIMITES_SITIO.enlaces, `Hasta ${LIMITES_SITIO.enlaces} enlaces.`),
});

export const encabezadoSchema = z.object({
  destacado: opcional(40).transform((v) => v ?? ""),
  titulo: texto(120, "Escribe el título."),
  subtitulo: texto(240, "Escribe el subtítulo."),
  fotos: z
    .array(imagen.extend({ posicion: z.string().max(20).optional() }))
    .min(1, "Agrega al menos una foto.")
    .max(LIMITES_SITIO.fotos, `Hasta ${LIMITES_SITIO.fotos} fotos.`),
});

export const actoresSchema = z.object({
  titulo: texto(120, "Escribe el título."),
  texto: texto(400, "Escribe el texto."),
  sectores: z
    .array(
      z.object({
        nombre: texto(60, "Escribe el nombre del sector."),
        detalle: texto(160, "Escribe el detalle."),
        icono: z.enum(
          Object.keys(ICONOS_SECTOR) as [IconoSector, ...IconoSector[]],
          "Elige el ícono.",
        ),
      }),
    )
    .min(1, "Agrega al menos un sector.")
    .max(LIMITES_SITIO.sectores, `Hasta ${LIMITES_SITIO.sectores} sectores.`),
});

/** Los errores de Zod por campo, con la ruta en puntos («redes.0.url»). */
export function erroresDe(e: z.ZodError): Record<string, string> {
  const r: Record<string, string> = {};
  for (const i of e.issues) r[i.path.join(".") || "formulario"] ??= i.message;
  return r;
}

/* ---------- Almacén ---------- */

export const sitioDe = (alm: Almacen): DatosSitio => alm.sitio ?? SITIO_INICIAL;
export const encabezadoDe = (alm: Almacen): Encabezado =>
  alm.inicio.encabezado ?? ENCABEZADO_INICIAL;
export const actoresDe = (alm: Almacen): Actores => alm.inicio.actores ?? ACTORES_INICIAL;

export type ResultadoSitio =
  | { estado: "OK" }
  | { estado: "SIN_SESION" | "SIN_PERMISO" }
  | { estado: "INVALIDO"; errores: Record<string, string> };

function guardar<T>(
  alm: Almacen,
  sesion: string | undefined,
  permiso: "sitio.editar" | "inicio.editar",
  schema: z.ZodType<T>,
  datos: unknown,
  poner: (v: T) => void,
  accion: string,
  entidad: string,
  ahora: number,
): ResultadoSitio {
  const c = contextoDe(alm, sesion);
  if (!c?.alcaldia) return { estado: "SIN_SESION" };
  if (!c.permisos.has(permiso)) return { estado: "SIN_PERMISO" };
  const p = schema.safeParse(datos);
  if (!p.success) return { estado: "INVALIDO", errores: erroresDe(p.error) };
  poner(p.data);
  registrar(alm, { actorId: c.usuario.id, alcaldiaId: c.alcaldia.id, accion, entidad }, ahora);
  return { estado: "OK" };
}

export const guardarSitio = (
  alm: Almacen,
  sesion: string | undefined,
  datos: unknown,
  ahora = Date.now(),
) =>
  guardar(
    alm,
    sesion,
    "sitio.editar",
    sitioSchema,
    datos,
    (v) => (alm.sitio = v as DatosSitio),
    "SITIO_EDITADO",
    "sitio",
    ahora,
  );

export const guardarEncabezado = (
  alm: Almacen,
  sesion: string | undefined,
  datos: unknown,
  ahora = Date.now(),
) =>
  guardar(
    alm,
    sesion,
    "inicio.editar",
    encabezadoSchema,
    datos,
    (v) => (alm.inicio.encabezado = v as Encabezado),
    "INICIO_ENCABEZADO_EDITADO",
    "inicio:encabezado",
    ahora,
  );

export const guardarActores = (
  alm: Almacen,
  sesion: string | undefined,
  datos: unknown,
  ahora = Date.now(),
) =>
  guardar(
    alm,
    sesion,
    "inicio.editar",
    actoresSchema,
    datos,
    (v) => (alm.inicio.actores = v as Actores),
    "INICIO_ACTORES_EDITADO",
    "inicio:actores",
    ahora,
  );
